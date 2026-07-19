import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    @InjectQueue('knowledge-queue') private knowledgeQueue: Queue,
  ) {}

  async uploadAndIndex(
    userId: string,
    originalName: string,
    buffer: Buffer,
    mimeType: string,
    collectionId?: string,
  ) {
    const doc = await this.storageService.uploadUserFile(
      userId,
      originalName,
      buffer,
      mimeType,
    );

    if (collectionId) {
      const collection = await this.prisma.documentCollection.findFirst({
        where: { id: collectionId, userId },
      });
      if (collection) {
        await this.prisma.document.update({
          where: { id: doc.id },
          data: { collectionId },
        });
      }
    }

    const job = await this.knowledgeQueue.add('index-document-job', {
      documentId: doc.id,
      userId,
    });

    this.logger.log(
      `[KnowledgeService] Queued indexing job ${job.id} for document ${doc.id}`,
    );

    return {
      documentId: doc.id,
      name: doc.name,
      fileUrl: doc.fileUrl,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      status: 'queued',
      jobId: job.id,
    };
  }

  async deleteDocument(userId: string, id: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, userId },
    });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    await this.storageService.deleteUserFile(userId, id);

    this.logger.log(
      `[KnowledgeService] Deleted document ${id} for user ${userId}`,
    );
    return { success: true };
  }

  async createCollection(userId: string, name: string, description?: string) {
    const existing = await this.prisma.documentCollection.findFirst({
      where: { name: name.trim(), userId },
    });
    if (existing) {
      throw new BadRequestException(
        'A collection with this name already exists',
      );
    }

    return this.prisma.documentCollection.create({
      data: {
        userId,
        name: name.trim(),
        description: description?.trim() || null,
      },
    });
  }

  async listCollections(userId: string) {
    return this.prisma.documentCollection.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { documents: true },
        },
      },
    });
  }

  async getCollectionDetails(userId: string, id: string) {
    const col = await this.prisma.documentCollection.findFirst({
      where: { id, userId },
      include: {
        documents: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!col) {
      throw new NotFoundException('Collection not found');
    }
    return col;
  }

  async deleteCollection(userId: string, id: string) {
    const col = await this.prisma.documentCollection.findFirst({
      where: { id, userId },
    });
    if (!col) {
      throw new NotFoundException('Collection not found');
    }

    await this.prisma.document.updateMany({
      where: { collectionId: id, userId },
      data: { collectionId: null },
    });

    await this.prisma.documentCollection.delete({
      where: { id },
    });

    return { success: true };
  }
}
