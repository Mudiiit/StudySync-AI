import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { STORAGE_PROVIDER } from './interfaces/storage-provider.interface';
import type { StorageProvider } from './interfaces/storage-provider.interface';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import * as path from 'path';

@Injectable()
export class StorageService {
  private allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
  ];
  private maxSizeBytes = 10 * 1024 * 1024; // 10MB limit

  constructor(
    @Inject(STORAGE_PROVIDER) private provider: StorageProvider,
    private prisma: PrismaService,
  ) {}

  async uploadUserFile(
    userId: string,
    originalName: string,
    buffer: Buffer,
    mimeType: string,
  ) {
    // 1. Validate file
    if (!this.allowedMimeTypes.includes(mimeType)) {
      throw new BadRequestException(
        `Mime type '${mimeType}' is not supported for uploads.`,
      );
    }

    if (buffer.length > this.maxSizeBytes) {
      throw new BadRequestException(
        'File exceeds the maximum permitted upload limit of 10MB.',
      );
    }

    // 2. Generate unique key
    const fileExtension = path.extname(originalName);
    const fileKey = `${userId}/${randomUUID()}${fileExtension}`;

    // 3. Upload to provider
    const fileUrl = await this.provider.uploadFile(fileKey, buffer, mimeType);

    // 4. Save metadata in DB
    return this.prisma.document.create({
      data: {
        userId,
        name: originalName,
        fileUrl,
        fileSize: buffer.length,
        mimeType,
      },
    });
  }

  async getSignedDownloadUrl(userId: string, documentId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, userId },
    });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    // If local dev, local URL doesn't need pre-signing
    if (
      doc.fileUrl.startsWith('http') &&
      !doc.fileUrl.includes('storage/files')
    ) {
      // Cloud S3 storage key extraction
      const parts = doc.fileUrl.split('.com/');
      const fileKey = parts[1] || doc.fileUrl;
      return this.provider.getSignedUrl(fileKey);
    }

    return doc.fileUrl;
  }

  async deleteUserFile(userId: string, documentId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, userId },
    });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    // Delete from provider
    let fileKey = doc.fileUrl;
    if (doc.fileUrl.includes('storage/files/')) {
      fileKey = doc.fileUrl.split('storage/files/')[1];
    } else {
      const parts = doc.fileUrl.split('.com/');
      fileKey = parts[1] || doc.fileUrl;
    }
    await this.provider.deleteFile(fileKey);

    // Delete from DB
    await this.prisma.document.delete({
      where: { id: documentId },
    });
  }

  async uploadAvatar(
    userId: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    const allowedImages = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ];
    if (!allowedImages.includes(mimeType)) {
      throw new BadRequestException(
        'Only JPEG, PNG, WEBP, and GIF images are allowed for avatars',
      );
    }

    // 2MB size limit for avatar
    if (buffer.length > 2 * 1024 * 1024) {
      throw new BadRequestException('Avatar image exceeds the 2MB size limit');
    }

    const fileExtension =
      mimeType === 'image/webp'
        ? '.webp'
        : mimeType === 'image/png'
          ? '.png'
          : mimeType === 'image/gif'
            ? '.gif'
            : '.jpg';
    const fileKey = `avatars/${userId}-${Date.now()}${fileExtension}`;

    const fileUrl = await this.provider.uploadFile(fileKey, buffer, mimeType);
    return fileUrl;
  }
}
