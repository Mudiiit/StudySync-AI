import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('social')
@UseGuards(JwtAuthGuard)
export class ChallengesController {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // LIST ACTIVE GROUP CHALLENGES
  // ==========================================
  @Get('groups/:groupId/challenges')
  async getGroupChallenges(
    @Request() req: any,
    @Param('groupId') groupId: string,
  ) {
    const userId = req.user.id;

    // Verify membership
    const member = await this.prisma.studyGroupMember.findUnique({
      where: { studyGroupId_userId: { studyGroupId: groupId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a group member');

    const list = await this.prisma.groupChallenge.findMany({
      where: { studyGroupId: groupId },
      include: {
        progress: {
          include: {
            user: { include: { profile: true } },
          },
        },
      },
    });

    // Run active progress update on-demand to guarantee real-time accuracy
    const updatedList = [];
    for (const chal of list) {
      // Find or create caller progress
      let userProg = chal.progress.find((p) => p.userId === userId);
      if (!userProg) {
        userProg = await this.prisma.challengeProgress.create({
          data: { challengeId: chal.id, userId, current: 0, completed: false },
          include: { user: { include: { profile: true } } },
        });
        chal.progress.push(userProg);
      }

      // Compute current progress value
      const val = await this.computeProgressValue(userId, chal);
      const isDone = val >= chal.target;

      if (val !== userProg.current || isDone !== userProg.completed) {
        const updatedProg = await this.prisma.challengeProgress.update({
          where: { id: userProg.id },
          data: { current: val, completed: isDone },
          include: { user: { include: { profile: true } } },
        });
        // Replace in progress array
        const idx = chal.progress.findIndex((p) => p.id === userProg.id);
        if (idx !== -1) chal.progress[idx] = updatedProg;
      }

      updatedList.push(chal);
    }

    return updatedList;
  }

  // ==========================================
  // CREATE GROUP CHALLENGE
  // ==========================================
  @Post('groups/:groupId/challenges')
  async createChallenge(
    @Request() req: any,
    @Param('groupId') groupId: string,
    @Body()
    body: {
      title: string;
      description?: string;
      type: string;
      target: number;
      period: 'WEEKLY' | 'MONTHLY';
    },
  ) {
    const userId = req.user.id;

    const member = await this.prisma.studyGroupMember.findUnique({
      where: { studyGroupId_userId: { studyGroupId: groupId, userId } },
    });
    if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
      throw new ForbiddenException(
        'Only owners and admins can create challenges',
      );
    }

    const startDate = new Date();
    const endDate = new Date();
    if (body.period === 'WEEKLY') {
      endDate.setDate(startDate.getDate() + 7);
    } else {
      endDate.setMonth(startDate.getMonth() + 1);
    }

    const newChal = await this.prisma.groupChallenge.create({
      data: {
        studyGroupId: groupId,
        title: body.title,
        description: body.description,
        type: body.type,
        target: body.target,
        period: body.period,
        startDate,
        endDate,
      },
    });

    // Notify group members
    const groupMembers = await this.prisma.studyGroupMember.findMany({
      where: { studyGroupId: groupId, userId: { not: userId } },
    });
    for (const gm of groupMembers) {
      await this.prisma.notification.create({
        data: {
          userId: gm.userId,
          title: 'New Group Challenge',
          message: `Join the "${body.title}" study challenge now!`,
          type: 'CHALLENGE_INVITE',
        },
      });
    }

    return newChal;
  }

  // ==========================================
  // HELPER: CALCULATE DATABASE VALUE
  // ==========================================
  private async computeProgressValue(
    userId: string,
    challenge: any,
  ): Promise<number> {
    let count = 0;
    try {
      if (challenge.type === 'STUDY_HOURS') {
        const stats = await this.prisma.pomodoroSession.aggregate({
          _sum: { durationMinutes: true },
          where: {
            userId,
            createdAt: { gte: challenge.startDate, lte: challenge.endDate },
          },
        });
        count = (stats._sum.durationMinutes || 0) / 60.0;
      } else if (challenge.type === 'FLASHCARDS') {
        count = await this.prisma.flashcardDeck.count({
          where: {
            userId,
            createdAt: { gte: challenge.startDate, lte: challenge.endDate },
          },
        });
      } else if (challenge.type === 'NOTES') {
        count = await this.prisma.note.count({
          where: {
            userId,
            createdAt: { gte: challenge.startDate, lte: challenge.endDate },
          },
        });
      } else if (challenge.type === 'QUIZZES') {
        count = await this.prisma.attempt.count({
          where: {
            userId,
            startedAt: { gte: challenge.startDate, lte: challenge.endDate },
          },
        });
      }
    } catch (e) {
      // Ignored
    }

    return Number(count.toFixed(2));
  }
}
