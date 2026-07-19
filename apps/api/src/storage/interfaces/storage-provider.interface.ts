export interface StorageProvider {
  uploadFile(
    fileKey: string,
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<string>;
  deleteFile(fileKey: string): Promise<void>;
  getSignedUrl(fileKey: string, expiresSeconds?: number): Promise<string>;
}

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';
export default StorageProvider;
