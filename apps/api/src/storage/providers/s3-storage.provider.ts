import { Injectable, Logger } from '@nestjs/common';
import { StorageProvider } from '../interfaces/storage-provider.interface';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3StorageProvider implements StorageProvider {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );
    const endpoint = this.configService.get<string>('AWS_S3_ENDPOINT');

    this.bucketName =
      this.configService.get<string>('AWS_S3_BUCKET') || 'studysync-uploads';

    this.s3Client = new S3Client({
      region,
      credentials:
        accessKeyId && secretAccessKey
          ? {
              accessKeyId,
              secretAccessKey,
            }
          : undefined,
      endpoint: endpoint || undefined,
      forcePathStyle: !!endpoint,
    });
  }

  async uploadFile(
    fileKey: string,
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
        Body: fileBuffer,
        ContentType: mimeType,
      }),
    );
    return fileKey;
  }

  async deleteFile(fileKey: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
      }),
    );
  }

  async getSignedUrl(fileKey: string, expiresSeconds = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
    });
    return getSignedUrl(this.s3Client, command, { expiresIn: expiresSeconds });
  }
}
