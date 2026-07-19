import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SchedulerService } from './scheduler.service';
import { PlannerGeneratorService } from './planner-generator.service';

@Injectable()
export class PlannerService {
  private readonly logger = new Logger(PlannerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduler: SchedulerService,
    private readonly generator: PlannerGeneratorService,
  ) {}

  async getTodayPlan(userId: string) {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    let plan = await this.prisma.studyPlan.findFirst({
      where: {
        userId,
        type: 'DAILY',
        startDate: { gte: startOfDay },
      },
      include: {
        sessions: { orderBy: { startTime: 'asc' } },
      },
    });

    if (!plan) {
      // Auto-generate daily plan if not present
      const generated = await this.generator.generateDailyPlanAndSave(userId, {
        availableHours: 4,
      });
      plan = await this.prisma.studyPlan.findUnique({
        where: { id: generated.plan.id },
        include: { sessions: { orderBy: { startTime: 'asc' } } },
      });
    }

    // Fetch active spaced repetition items
    const revisions = await this.prisma.revisionSchedule.findMany({
      where: { userId, status: 'PENDING' },
      take: 5,
    });

    return {
      plan,
      revisions,
    };
  }

  async completeSession(userId: string, sessionId: string) {
    const session = await this.prisma.studySession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) throw new NotFoundException('Study session not found');

    const updatedSession = await this.prisma.studySession.update({
      where: { id: sessionId },
      data: { isCompleted: true },
    });

    // Update study plan completed hours
    if (session.planId) {
      const allSessions = await this.prisma.studySession.findMany({
        where: { planId: session.planId },
      });
      const completedHours = allSessions
        .filter((s) => s.isCompleted)
        .reduce((acc, s) => acc + s.durationMins / 60, 0);

      await this.prisma.studyPlan.update({
        where: { id: session.planId },
        data: { completedHours: Number(completedHours.toFixed(1)) },
      });
    }

    // Spaced repetition update or creation
    const revision = await this.prisma.revisionSchedule.findFirst({
      where: { userId, subject: session.subject, topicName: session.topic },
    });

    const nextCalc = this.scheduler.calculateSpacedRepetitionInterval(
      revision?.intervalDays ?? 1,
      revision?.easeFactor ?? 2.5,
      85, // Default successful completion score
    );

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + nextCalc.nextIntervalDays);

    if (revision) {
      await this.prisma.revisionSchedule.update({
        where: { id: revision.id },
        data: {
          intervalDays: nextCalc.nextIntervalDays,
          easeFactor: nextCalc.newEaseFactor,
          repetitionCount: revision.repetitionCount + 1,
          lastRevisedAt: new Date(),
          nextRevisionDate: nextDate,
          status: 'PENDING',
        },
      });
    } else {
      await this.prisma.revisionSchedule.create({
        data: {
          userId,
          subject: session.subject,
          topicName: session.topic,
          intervalDays: nextCalc.nextIntervalDays,
          easeFactor: nextCalc.newEaseFactor,
          repetitionCount: 1,
          lastRevisedAt: new Date(),
          nextRevisionDate: nextDate,
        },
      });
    }

    return updatedSession;
  }
}
