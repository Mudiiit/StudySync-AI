import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TaskStatus } from '@studysync/database';

@Injectable()
export class BoardService {
  constructor(private readonly prisma: PrismaService) {}

  async getKanbanColumns(
    userId: string,
    workspaceId: string,
    projectId?: string,
  ) {
    const filter: any = {
      userId,
      workspaceId,
      inTrash: false,
    };

    if (projectId) {
      filter.projectId = projectId === 'root' ? null : projectId;
    }

    const tasks = await this.prisma.task.findMany({
      where: filter,
      orderBy: { order: 'asc' },
      include: {
        project: {
          select: { name: true, healthScore: true },
        },
        labelMappings: {
          include: {
            label: true,
          },
        },
        checklists: {
          include: {
            items: true,
          },
        },
      },
    });

    const columns: Record<TaskStatus, any[]> = {
      TODO: [],
      IN_PROGRESS: [],
      REVIEW: [],
      DONE: [],
    };

    tasks.forEach((t) => {
      if (columns[t.status]) {
        columns[t.status].push(t);
      } else {
        columns.TODO.push(t);
      }
    });

    return columns;
  }
}
