import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatusService {
  constructor(private prisma: PrismaService) {}

  // Update heartbeat status
  async updateHeartbeat(userId: string, status: string): Promise<void> {
    const validStatuses = [
      'ONLINE',
      'STUDYING',
      'IN_POMODORO',
      'TAKING_QUIZ',
      'READING_NOTES',
      'IDLE',
      'OFFLINE',
    ];
    const targetStatus = validStatuses.includes(status) ? status : 'ONLINE';

    await this.prisma.profile.update({
      where: { userId },
      data: {
        status: targetStatus,
        lastActiveAt: new Date(),
      },
    });

    // Fire off lightweight check-out of inactive users
    this.checkInactiveUsers().catch(() => {});
  }

  // Set specific status
  async setStatus(userId: string, status: string): Promise<void> {
    await this.prisma.profile.update({
      where: { userId },
      data: {
        status,
        lastActiveAt: new Date(),
      },
    });
  }

  // Scan and mark inactive users as offline
  async checkInactiveUsers(): Promise<void> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    await this.prisma.profile.updateMany({
      where: {
        status: { not: 'OFFLINE' },
        lastActiveAt: { lt: fiveMinutesAgo },
      },
      data: {
        status: 'OFFLINE',
      },
    });
  }
}
