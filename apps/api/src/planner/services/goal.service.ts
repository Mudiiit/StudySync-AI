import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GoalService {
  private readonly logger = new Logger(GoalService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getUserGoals(userId: string) {
    return this.prisma.studyGoal.findMany({
      where: { userId },
      include: { milestones: { orderBy: { order: 'asc' } } },
      orderBy: { targetDate: 'asc' },
    });
  }

  async createGoal(
    userId: string,
    title: string,
    subject?: string,
    targetHours = 10,
    targetDateStr?: string,
  ) {
    const targetDate = targetDateStr
      ? new Date(targetDateStr)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    return this.prisma.studyGoal.create({
      data: {
        userId,
        title,
        subject,
        targetHours,
        targetDate,
      },
    });
  }

  async toggleMilestone(userId: string, milestoneId: string) {
    const milestone = await this.prisma.studyMilestone.findFirst({
      where: { id: milestoneId, userId },
    });
    if (!milestone) throw new NotFoundException('Milestone not found');

    const updated = await this.prisma.studyMilestone.update({
      where: { id: milestoneId },
      data: { isCompleted: !milestone.isCompleted },
    });

    // Recalculate goal progress
    const goalMilestones = await this.prisma.studyMilestone.findMany({
      where: { goalId: milestone.goalId },
    });

    const completedHours = goalMilestones
      .filter((m) => m.isCompleted)
      .reduce((acc, m) => acc + m.estimatedHours, 0);

    const totalHours = goalMilestones.reduce(
      (acc, m) => acc + m.estimatedHours,
      0,
    );

    await this.prisma.studyGoal.update({
      where: { id: milestone.goalId },
      data: {
        currentHours: completedHours,
        status: completedHours >= totalHours ? 'COMPLETED' : 'IN_PROGRESS',
      },
    });

    return updated;
  }
}
