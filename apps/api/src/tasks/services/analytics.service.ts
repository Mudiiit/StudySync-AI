import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspaceAnalyticsSummary } from '../interfaces/task-workspace.interface';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getWorkspaceAnalytics(
    userId: string,
    workspaceId: string,
  ): Promise<WorkspaceAnalyticsSummary> {
    const tasks = await this.prisma.task.findMany({
      where: { userId, workspaceId, inTrash: false },
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(
      (t) => t.isCompleted || t.status === 'DONE',
    ).length;
    const completionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

    const overdueCount = tasks.filter(
      (t) => !t.isCompleted && t.dueDate && t.dueDate < new Date(),
    ).length;

    // Simple velocity = tasks completed per week average
    const velocity =
      completedTasks > 0 ? parseFloat((completedTasks / 2).toFixed(1)) : 1.0;

    // Burnup and burndown values
    const burnupScore = completionRate;
    const burndownScore = 100 - completionRate;

    return {
      completionRate,
      velocity,
      burnupScore,
      burndownScore,
      overdueCount,
      totalTasks,
      completedTasks,
    };
  }

  async getBurnupChart(userId: string, workspaceId: string) {
    const now = new Date();
    const chartData = [];

    // Aggregate daily stats for last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(now.getDate() - i);
      const dateString = date.toISOString().split('T')[0];

      const total = await this.prisma.task.count({
        where: {
          userId,
          workspaceId,
          inTrash: false,
          createdAt: { lte: date },
        },
      });

      const completed = await this.prisma.task.count({
        where: {
          userId,
          workspaceId,
          inTrash: false,
          isCompleted: true,
          updatedAt: { lte: date },
        },
      });

      chartData.push({
        date: dateString,
        total,
        completed,
      });
    }

    return chartData;
  }
}
