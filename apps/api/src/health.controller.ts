import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @Get('live')
  getLive() {
    return { status: 'OK', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  async getReady() {
    try {
      // 1. Test database ping
      await this.prisma.$queryRaw`SELECT 1`;

      // 2. Test Redis connection
      const client = this.redis.getRedisClient();
      if (client) {
        await client.ping();
      }

      return { status: 'READY', database: 'UP', redis: 'UP' };
    } catch (e: any) {
      throw new ServiceUnavailableException({
        status: 'DOWN',
        reason: e.message,
      });
    }
  }
}
