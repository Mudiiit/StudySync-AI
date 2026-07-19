import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class FeatureFlagService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async isEnabled(key: string): Promise<boolean> {
    const cacheKey = `feature-flag:${key}`;

    // 1. Try Redis cache first
    const cached = await this.redis.get(cacheKey);
    if (cached !== null) {
      return cached === 'true';
    }

    // 2. Fetch from DB
    const flag = await this.prisma.featureFlag.findUnique({
      where: { key },
    });

    const isEnabled = flag ? flag.isEnabled : false;

    // 3. Cache in Redis (1 hour TTL)
    await this.redis.set(cacheKey, String(isEnabled), 3600);

    return isEnabled;
  }

  async toggleFlag(key: string, isEnabled: boolean): Promise<any> {
    const flag = await this.prisma.featureFlag.upsert({
      where: { key },
      update: { isEnabled },
      create: { key, isEnabled },
    });

    // Invalidate Redis cache key
    await this.redis.del(`feature-flag:${key}`);

    return flag;
  }

  async listFlags() {
    return this.prisma.featureFlag.findMany({
      orderBy: { key: 'asc' },
    });
  }
}
