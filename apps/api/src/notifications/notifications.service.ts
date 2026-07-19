import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
    @InjectQueue('notification-queue') private notifyQueue: Queue,
  ) {}

  // ==========================================
  // SEND NOTIFICATION
  // ==========================================

  async sendNotification(
    userId: string,
    title: string,
    message: string,
    type: string,
  ) {
    // 1. Get or create notification preferences
    let pref = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!pref) {
      pref = await this.prisma.notificationPreference.create({
        data: { userId, email: true, inApp: true, push: false },
      });
    }

    let inAppNotification = null;

    // 2. Dispatch In-App alert
    if (pref.inApp) {
      inAppNotification = await this.prisma.notification.create({
        data: {
          userId,
          title,
          message,
          type,
        },
      });

      // Emit real-time WebSocket event
      this.gateway.sendToUser(userId, 'notification', inAppNotification);
    }

    // 3. Dispatch Email Job to Queue
    if (pref.email) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (user && user.email) {
        await this.notifyQueue.add('send-email', {
          to: user.email,
          subject: title,
          body: message,
        });
      }
    }

    return inAppNotification;
  }

  // ==========================================
  // RETRIEVAL & MARK STATUS
  // ==========================================

  async getNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return {
      notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async markAsRead(userId: string, id: string) {
    const notify = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notify) throw new NotFoundException('Notification not found');

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  // ==========================================
  // PREFERENCES
  // ==========================================

  async getPreferences(userId: string) {
    let pref = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
    if (!pref) {
      pref = await this.prisma.notificationPreference.create({
        data: { userId, email: true, inApp: true, push: false },
      });
    }
    return pref;
  }

  async updatePreferences(
    userId: string,
    updates: { email?: boolean; inApp?: boolean; push?: boolean },
  ) {
    return this.prisma.notificationPreference.update({
      where: { userId },
      data: updates,
    });
  }
}
