import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const port = this.configService.get<number>('REDIS_PORT') || 6379;
    const url = this.configService.get<string>('REDIS_URL');

    try {
      if (url) {
        this.client = new Redis(url, { maxRetriesPerRequest: 3 });
      } else {
        this.client = new Redis({ host, port, maxRetriesPerRequest: 3 });
      }

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log('Successfully connected to Redis');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`Redis connection failed/lost: ${err.message}`);
      });
    } catch (e: any) {
      this.logger.error(`Error initializing Redis client: ${e.message}`);
    }
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.disconnect();
    }
  }

  getRedisClient(): Redis | null {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    if (!this.isConnected || !this.client) return null;
    try {
      return await this.client.get(key);
    } catch (e) {
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      const strVal = typeof value === 'string' ? value : JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.set(key, strVal, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, strVal);
      }
    } catch (e) {
      // fail-soft
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      await this.client.del(key);
    } catch (e) {
      // fail-soft
    }
  }

  // ==========================================
  // DISTRIBUTED LOCK (Redlockconcept)
  // ==========================================

  async acquireLock(lockKey: string, ttlMs = 5000): Promise<boolean> {
    if (!this.isConnected || !this.client) return true; // Fail-soft: acquire lock if redis is down
    try {
      const res = await (this.client as any).set(
        `lock:${lockKey}`,
        'locked',
        'NX',
        'PX',
        ttlMs,
      );
      return res === 'OK';
    } catch (e) {
      return true;
    }
  }

  async releaseLock(lockKey: string): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      await this.client.del(`lock:${lockKey}`);
    } catch (e) {
      // fail-soft
    }
  }
}
