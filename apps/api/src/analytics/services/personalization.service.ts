import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TaskStatus, TaskPriority } from '@prisma/client';

@Injectable()
export class PersonalizationService {
  constructor(private prisma: PrismaService) {}

  async getRecommendations(userId: string) {
    // 1. High priority tasks to focus on
    const tasks = await this.prisma.task.findMany({
      where: {
        userId,
        status: { not: TaskStatus.DONE },
        priority: { in: [TaskPriority.HIGH, TaskPriority.URGENT] },
        inTrash: false,
      },
      take: 3,
    });

    // 2. Concepts/Notes to review (oldest notes by update time)
    const notes = await this.prisma.note.findMany({
      where: { userId },
      orderBy: { updatedAt: 'asc' },
      take: 3,
    });

    const recommendations: any[] = [];

    for (const t of tasks) {
      recommendations.push({
        type: 'TASK_PRIORITY',
        title: `Complete critical task: "${t.title}"`,
        description: `Marked as ${t.priority} priority. Ready to check off.`,
        actionUrl: `/tasks`,
      });
    }

    for (const n of notes) {
      recommendations.push({
        type: 'CONCEPT_REVIEW',
        title: `Revisit notes on "${n.title}"`,
        description: `Last reviewed on ${n.updatedAt.toLocaleDateString()}. Re-reading boosts active recall retention.`,
        actionUrl: `/notes`,
      });
    }

    // Add standard default tips if list is empty
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'STUDY_HABIT',
        title: 'Initialize study schedules',
        description:
          'Creating your first notebook page unlocks personalized AI summary cards.',
        actionUrl: '/notes',
      });
    }

    return recommendations;
  }
}
