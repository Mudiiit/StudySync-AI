import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { STORAGE_PROVIDER } from './interfaces/storage-provider.interface';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';
import { ConfigService } from '@nestjs/config';
import { forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [StorageController],
  providers: [
    StorageService,
    {
      provide: STORAGE_PROVIDER,
      useFactory: (config: ConfigService) => {
        const hasAws = config.get<string>('AWS_ACCESS_KEY_ID');
        if (hasAws) {
          return new S3StorageProvider(config);
        }
        return new LocalStorageProvider(config);
      },
      inject: [ConfigService],
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
