import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('REDIS_HOST') || 'localhost';
        const port = config.get<number>('REDIS_PORT') || 6379;
        const url = config.get<string>('REDIS_URL');
        return {
          connection: url ? { url } : { host, port },
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'notification-queue',
    }),
    BullModule.registerQueue({
      name: 'cleanup-queue',
    }),
    BullModule.registerQueue({
      name: 'ai-queue',
    }),
  ],
  exports: [BullModule],
})
export class QueuesModule {}
