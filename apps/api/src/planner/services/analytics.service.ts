import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductivitySummary } from '../interfaces/planner.interface';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getUserAnalytics(userId: string): Promise<ProductivitySummary> {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    // Completed sessions today
    const sessionsToday = await this.prisma.studySession.findMany({
      where: {
        userId,
        startTime: { gte: startOfDay },
      },
    });

    const totalStudyMins = sessionsToday.reduce(
      (acc, s) => acc + (s.isCompleted ? s.durationMins : 0),
      0,
    );
    const completedBlocks = sessionsToday.filter((s) => s.isCompleted).length;
    const totalBlocks = sessionsToday.length;
    const completionRate =
      totalBlocks > 0 ? Math.round((completedBlocks / totalBlocks) * 100) : 100;

    // Calculate streak days
    const recentSessions = await this.prisma.studySession.findMany({
      where: { userId, isCompleted: true },
      orderBy: { startTime: 'desc' },
      take: 30,
    });

    const uniqueDates = new Set(
      recentSessions.map((s) => s.startTime.toISOString().split('T')[0]),
    );
    const streakDays = uniqueDates.size > 0 ? uniqueDates.size : 1;

    // Quiz readiness score calculation
    const attempts = await this.prisma.attempt.findMany({
      where: { userId },
      select: { percentage: true },
      take: 10,
    });

    const avgQuiz =
      attempts.length > 0
        ? attempts.reduce((acc: number, a: any) => acc + a.percentage, 0) /
          attempts.length
        : 80;

    const examReadinessScore = Math.min(
      98,
      Math.round(avgQuiz * 0.6 + completionRate * 0.4),
    );

    return {
      totalStudyMins,
      completedBlocks,
      focusScore: Math.min(96, 75 + completedBlocks * 5),
      completionRate,
      learningVelocity: Number((1.0 + completedBlocks * 0.1).toFixed(1)),
      streakDays,
      examReadinessScore,
    };
  }
}
