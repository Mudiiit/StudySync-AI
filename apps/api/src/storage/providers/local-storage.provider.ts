import { Injectable, Logger } from '@nestjs/common';
import { StorageProvider } from '../interfaces/storage-provider.interface';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private uploadDir: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureDirectoryExists();
  }

  private async ensureDirectoryExists() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (e: any) {
      this.logger.error(
        `Failed to create local upload directory: ${e.message}`,
      );
    }
  }

  async uploadFile(
    fileKey: string,
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    const filePath = path.join(this.uploadDir, fileKey);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, fileBuffer);

    const port = this.configService.get<string>('PORT') || '5001';
    const apiBaseUrl =
      this.configService.get<string>('API_BASE_URL') ||
      `http://localhost:${port}`;
    return `${apiBaseUrl}/storage/files/${fileKey}`;
  }

  async deleteFile(fileKey: string): Promise<void> {
    try {
      const filePath = path.join(this.uploadDir, fileKey);
      await fs.unlink(filePath);
    } catch (e: any) {
      this.logger.warn(`Could not delete file locally: ${e.message}`);
    }
  }

  async getSignedUrl(fileKey: string, _expiresSeconds = 3600): Promise<string> {
    // Local dev: returns standard file path link since local files have no credentials restrictions
    const port = this.configService.get<string>('PORT') || '5001';
    const apiBaseUrl =
      this.configService.get<string>('API_BASE_URL') ||
      `http://localhost:${port}`;
    return await Promise.resolve(`${apiBaseUrl}/storage/files/${fileKey}`);
  }
}
