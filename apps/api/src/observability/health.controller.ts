import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @Get()
  async checkHealth() {
    let dbStatus = 'healthy';
    let redisStatus = 'healthy';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (e) {
      dbStatus = 'unhealthy';
    }

    try {
      const client = this.redis.getRedisClient();
      if (!client || client.status !== 'ready') {
        redisStatus = 'unhealthy';
      }
    } catch (e) {
      redisStatus = 'unhealthy';
    }

    return {
      status:
        dbStatus === 'healthy' && redisStatus === 'healthy'
          ? 'healthy'
          : 'degraded',
      services: {
        database: dbStatus,
        redis: redisStatus,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
