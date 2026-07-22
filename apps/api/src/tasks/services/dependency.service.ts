import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DependencyCheckReport } from '../interfaces/task-workspace.interface';

@Injectable()
export class DependencyService {
  constructor(private readonly prisma: PrismaService) {}

  async checkDependencies(
    userId: string,
    taskId: string,
  ): Promise<DependencyCheckReport> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, userId },
      include: {
        dependencies: {
          include: {
            dependsOn: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const unmet = task.dependencies
      .filter((d) => !d.dependsOn.isCompleted && d.dependsOn.status !== 'DONE')
      .map((d) => ({
        id: d.dependsOn.id,
        title: d.dependsOn.title,
        status: d.dependsOn.status,
      }));

    return {
      hasUnmetDependencies: unmet.length > 0,
      unmetPrerequisites: unmet,
    };
  }

  async getDependencyGraph(userId: string, workspaceId: string) {
    const tasks = await this.prisma.task.findMany({
      where: { userId, workspaceId, inTrash: false },
      select: {
        id: true,
        title: true,
        status: true,
        isCompleted: true,
        dependencies: {
          select: {
            dependsOnId: true,
          },
        },
      },
    });

    const nodes = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      isCompleted: t.isCompleted,
    }));

    const edges = tasks.flatMap((t) =>
      t.dependencies.map((d) => ({
        source: d.dependsOnId,
        target: t.id,
      })),
    );

    return { nodes, edges };
  }
}
