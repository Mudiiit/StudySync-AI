import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@studysync/database';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    try {
      await this.$connect();
    } catch (e: any) {
      console.warn(
        `[PrismaService] Database connection deferred: ${e.message}`,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
