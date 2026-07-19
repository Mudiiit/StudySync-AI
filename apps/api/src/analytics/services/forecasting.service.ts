import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TaskStatus } from '@prisma/client';

@Injectable()
export class ForecastingService {
  constructor(private prisma: PrismaService) {}

  async getWorkloadForecast(userId: string) {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    // 1. Upcoming tasks
    const upcomingTasksCount = await this.prisma.task.count({
      where: {
        userId,
        status: { not: TaskStatus.DONE },
        dueDate: { gte: today, lte: nextWeek },
        inTrash: false,
      },
    });

    // 2. Task completion rate (historical)
    const completedTasks = await this.prisma.task.count({
      where: { userId, status: TaskStatus.DONE, inTrash: false },
    });
    const totalTasks = await this.prisma.task.count({
      where: { userId, inTrash: false },
    });

    const completionRate =
      totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 75.0;

    // 3. Busy ratio calculations
    let busyLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (upcomingTasksCount > 8) busyLevel = 'HIGH';
    else if (upcomingTasksCount > 3) busyLevel = 'MEDIUM';

    // 4. Expected completion probability
    const completionProbability = Math.round(completionRate * 0.9);

    return {
      upcomingTasksCount,
      busyLevel,
      completionRate: Math.round(completionRate),
      completionProbability: Math.min(100, completionProbability),
      deadlineRisk: upcomingTasksCount > 5 ? 'MEDIUM' : 'LOW',
      examReadinessScore: Math.round((completionRate + 85) / 2), // Balanced average index
    };
  }
}
