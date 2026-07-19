import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  async log(
    userId: string | null,
    action: string,
    entityName: string,
    entityId?: string | null,
    ipAddress?: string | null,
    userAgent?: string | null,
    metadata?: any,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          entityName,
          entityId: entityId || null,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          metadata: metadata || null,
        },
      });
    } catch (e) {
      // fail-soft: audit log write failures should not crash requests
    }
  }
}
