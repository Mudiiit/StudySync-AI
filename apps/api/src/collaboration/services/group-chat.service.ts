import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GroupChatService {
  constructor(private prisma: PrismaService) {}

  async sendMessage(userId: string, studyGroupId: string, content: string) {
    const member = await this.prisma.studyGroupMember.findUnique({
      where: { studyGroupId_userId: { studyGroupId, userId } },
    });
    if (!member) {
      throw new NotFoundException('You are not a member of this study group.');
    }

    return this.prisma.studyGroupMessage.create({
      data: {
        studyGroupId,
        userId,
        content,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  async getMessages(studyGroupId: string, limit = 50) {
    return this.prisma.studyGroupMessage.findMany({
      where: { studyGroupId },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  async searchMessages(studyGroupId: string, query: string) {
    return this.prisma.studyGroupMessage.findMany({
      where: {
        studyGroupId,
        content: { contains: query, mode: 'insensitive' },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  async editMessage(userId: string, messageId: string, content: string) {
    const message = await this.prisma.studyGroupMessage.findUnique({
      where: { id: messageId },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    if (message.userId !== userId) {
      throw new BadRequestException('You can only edit your own messages');
    }
    return this.prisma.studyGroupMessage.update({
      where: { id: messageId },
      data: { content },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  async deleteMessage(userId: string, messageId: string) {
    const message = await this.prisma.studyGroupMessage.findUnique({
      where: { id: messageId },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.userId !== userId) {
      const member = await this.prisma.studyGroupMember.findUnique({
        where: {
          studyGroupId_userId: { studyGroupId: message.studyGroupId, userId },
        },
      });
      if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
        throw new BadRequestException(
          'You do not have permission to delete this message',
        );
      }
    }

    await this.prisma.studyGroupMessage.delete({
      where: { id: messageId },
    });

    return { success: true };
  }

  async toggleReaction(userId: string, messageId: string, emoji: string) {
    const message = await this.prisma.studyGroupMessage.findUnique({
      where: { id: messageId },
    });
    if (!message) throw new NotFoundException('Message not found');

    let contentObj: any = {};
    try {
      contentObj = JSON.parse(message.content);
    } catch (e) {
      contentObj = { text: message.content };
    }

    if (!contentObj.reactions) contentObj.reactions = [];

    const existingIndex = contentObj.reactions.findIndex(
      (r: any) => r.emoji === emoji,
    );
    if (existingIndex > -1) {
      const rx = contentObj.reactions[existingIndex];
      const userIndex = rx.users.indexOf(userId);
      if (userIndex > -1) {
        rx.users.splice(userIndex, 1);
      } else {
        rx.users.push(userId);
      }
      // Clean up empty emoji reaction list
      if (rx.users.length === 0) {
        contentObj.reactions.splice(existingIndex, 1);
      }
    } else {
      contentObj.reactions.push({ emoji, users: [userId] });
    }

    return this.prisma.studyGroupMessage.update({
      where: { id: messageId },
      data: { content: JSON.stringify(contentObj) },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }
}
