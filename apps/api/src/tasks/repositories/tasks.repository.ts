import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWorkspaceDto } from '../dto/workspace.dto';
import { CreateProjectDto } from '../dto/project.dto';
import { CreateTaskDto, UpdateTaskDto } from '../dto/task.dto';

@Injectable()
export class TasksRepository {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // WORKSPACES
  // ==========================================

  async findWorkspacesByUser(userId: string) {
    return this.prisma.taskWorkspace.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  async createWorkspace(userId: string, dto: CreateWorkspaceDto) {
    return this.prisma.taskWorkspace.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description || null,
      },
    });
  }

  // ==========================================
  // PROJECTS
  // ==========================================

  async findProjectsByWorkspace(userId: string, workspaceId: string) {
    // Verify workspace access
    const ws = await this.prisma.taskWorkspace.findFirst({
      where: { id: workspaceId, userId },
    });
    if (!ws) {
      throw new NotFoundException('Workspace not found');
    }

    return this.prisma.taskProject.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' },
    });
  }

  async createProject(userId: string, dto: CreateProjectDto) {
    // Verify workspace ownership
    const ws = await this.prisma.taskWorkspace.findFirst({
      where: { id: dto.workspaceId, userId },
    });
    if (!ws) {
      throw new NotFoundException('Workspace not found');
    }

    return this.prisma.taskProject.create({
      data: {
        workspaceId: dto.workspaceId,
        name: dto.name,
        description: dto.description || null,
        status: dto.status || 'PLANNING',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
    });
  }

  // ==========================================
  // TASKS
  // ==========================================

  async findTasks(
    userId: string,
    filters: {
      workspaceId: string;
      projectId?: string;
      status?: string;
      priority?: string;
      inTrash?: boolean;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      userId,
      workspaceId: filters.workspaceId,
      inTrash: filters.inTrash !== undefined ? filters.inTrash : false,
    };

    if (filters.projectId) {
      whereClause.projectId =
        filters.projectId === 'root' ? null : filters.projectId;
    }
    if (filters.status) {
      whereClause.status = filters.status;
    }
    if (filters.priority) {
      whereClause.priority = filters.priority;
    }
    if (filters.search) {
      whereClause.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where: whereClause,
        orderBy: [{ order: 'asc' }, { updatedAt: 'desc' }],
        skip,
        take: limit,
        include: {
          project: {
            select: { name: true },
          },
          labelMappings: {
            include: {
              label: true,
            },
          },
          checklists: {
            include: {
              items: {
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      }),
      this.prisma.task.count({ where: whereClause }),
    ]);

    return {
      tasks,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findTaskById(userId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, userId },
      include: {
        project: true,
        comments: {
          include: {
            user: {
              select: {
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
          orderBy: { createdAt: 'asc' },
        },
        attachments: true,
        labelMappings: {
          include: {
            label: true,
          },
        },
        dependencies: {
          include: {
            dependsOn: true,
          },
        },
        checklists: {
          include: {
            items: {
              orderBy: { order: 'asc' },
            },
          },
        },
        recurrence: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async createTask(userId: string, dto: CreateTaskDto) {
    // Verify workspace access
    const ws = await this.prisma.taskWorkspace.findFirst({
      where: { id: dto.workspaceId, userId },
    });
    if (!ws) {
      throw new NotFoundException('Workspace not found');
    }

    // Determine order (append to end of column)
    const count = await this.prisma.task.count({
      where: {
        workspaceId: dto.workspaceId,
        status: dto.status || 'TODO',
        inTrash: false,
      },
    });

    return this.prisma.task.create({
      data: {
        userId,
        workspaceId: dto.workspaceId,
        projectId: dto.projectId || null,
        title: dto.title,
        description: dto.description || null,
        status: dto.status || 'TODO',
        priority: dto.priority || 'MEDIUM',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        estimatedMinutes: dto.estimatedMinutes || null,
        order: count,
      },
    });
  }

  async updateTask(userId: string, taskId: string, dto: UpdateTaskDto) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, userId },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Handle history logs dynamically
    const updateData: any = {};
    const changes: {
      changeType: string;
      oldValue: string;
      newValue: string;
    }[] = [];

    if (dto.title !== undefined && dto.title !== task.title) {
      updateData.title = dto.title;
      changes.push({
        changeType: 'TITLE_CHANGE',
        oldValue: task.title,
        newValue: dto.title,
      });
    }
    if (dto.description !== undefined && dto.description !== task.description) {
      updateData.description = dto.description;
    }
    if (dto.status !== undefined && dto.status !== task.status) {
      updateData.status = dto.status;
      changes.push({
        changeType: 'STATUS_CHANGE',
        oldValue: task.status,
        newValue: dto.status,
      });
    }
    if (dto.priority !== undefined && dto.priority !== task.priority) {
      updateData.priority = dto.priority;
      changes.push({
        changeType: 'PRIORITY_CHANGE',
        oldValue: task.priority,
        newValue: dto.priority,
      });
    }
    if (dto.isCompleted !== undefined && dto.isCompleted !== task.isCompleted) {
      updateData.isCompleted = dto.isCompleted;
      changes.push({
        changeType: 'COMPLETED_CHANGE',
        oldValue: String(task.isCompleted),
        newValue: String(dto.isCompleted),
      });
    }
    if (dto.dueDate !== undefined) {
      const newDate = dto.dueDate ? new Date(dto.dueDate) : null;
      if (newDate?.getTime() !== task.dueDate?.getTime()) {
        updateData.dueDate = newDate;
        changes.push({
          changeType: 'DUEDATE_CHANGE',
          oldValue: task.dueDate ? task.dueDate.toISOString() : 'None',
          newValue: newDate ? newDate.toISOString() : 'None',
        });
      }
    }
    if (dto.estimatedMinutes !== undefined)
      updateData.estimatedMinutes = dto.estimatedMinutes;
    if (dto.actualMinutes !== undefined)
      updateData.actualMinutes = dto.actualMinutes;
    if (dto.inTrash !== undefined) updateData.inTrash = dto.inTrash;
    if (dto.projectId !== undefined) updateData.projectId = dto.projectId;
    if (dto.order !== undefined) updateData.order = dto.order;

    // Execute transaction: save task and write audit changes
    const [updatedTask] = await this.prisma.$transaction([
      this.prisma.task.update({
        where: { id: taskId },
        data: updateData,
      }),
      ...changes.map((c) =>
        this.prisma.taskHistory.create({
          data: {
            taskId,
            userId,
            changeType: c.changeType,
            oldValue: c.oldValue,
            newValue: c.newValue,
          },
        }),
      ),
    ]);

    return updatedTask;
  }

  async deleteTask(userId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, userId },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.prisma.task.delete({
      where: { id: taskId },
    });
  }

  // ==========================================
  // COMMENTS
  // ==========================================

  async addComment(userId: string, taskId: string, content: string) {
    // Verify task
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, userId },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.prisma.taskComment.create({
      data: {
        taskId,
        userId,
        content,
      },
      include: {
        user: {
          select: {
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

  // ==========================================
  // DEPENDENCY ENGINE
  // ==========================================

  async addDependency(userId: string, taskId: string, dependsOnId: string) {
    if (taskId === dependsOnId) {
      throw new ConflictException('A task cannot depend on itself');
    }

    // Verify ownership of both tasks
    const tasks = await this.prisma.task.findMany({
      where: {
        id: { in: [taskId, dependsOnId] },
        userId,
      },
    });
    if (tasks.length < 2) {
      throw new NotFoundException('Tasks not found or lack permissions');
    }

    // Cycle detection check
    const createsCycle = await this.isDependencyCycle(dependsOnId, taskId);
    if (createsCycle) {
      throw new ConflictException(
        'Circular dependency detected. This would create a loop.',
      );
    }

    return this.prisma.taskDependency.create({
      data: {
        taskId,
        dependsOnId,
      },
    });
  }

  async removeDependency(userId: string, taskId: string, dependsOnId: string) {
    const dep = await this.prisma.taskDependency.findFirst({
      where: {
        taskId,
        dependsOnId,
        task: { userId },
      },
    });
    if (!dep) {
      throw new NotFoundException('Dependency relationship not found');
    }

    return this.prisma.taskDependency.delete({
      where: {
        taskId_dependsOnId: { taskId, dependsOnId },
      },
    });
  }

  private async isDependencyCycle(
    currentId: string,
    searchTargetId: string,
  ): Promise<boolean> {
    // Find everything currentId depends on
    const deps = await this.prisma.taskDependency.findMany({
      where: { taskId: currentId },
    });

    for (const d of deps) {
      if (d.dependsOnId === searchTargetId) {
        return true;
      }
      const childCycle = await this.isDependencyCycle(
        d.dependsOnId,
        searchTargetId,
      );
      if (childCycle) return true;
    }

    return false;
  }

  // ==========================================
  // CHECKLISTS
  // ==========================================

  async createChecklist(userId: string, taskId: string, title: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, userId },
    });
    if (!task) throw new NotFoundException('Task not found');

    return this.prisma.taskChecklist.create({
      data: {
        taskId,
        title,
      },
    });
  }

  async addChecklistItem(userId: string, checklistId: string, title: string) {
    const list = await this.prisma.taskChecklist.findFirst({
      where: { id: checklistId, task: { userId } },
    });
    if (!list) throw new NotFoundException('Checklist not found');

    const count = await this.prisma.taskChecklistItem.count({
      where: { checklistId },
    });

    return this.prisma.taskChecklistItem.create({
      data: {
        checklistId,
        title,
        order: count,
      },
    });
  }

  async toggleChecklistItem(
    userId: string,
    itemId: string,
    isCompleted: boolean,
  ) {
    const item = await this.prisma.taskChecklistItem.findFirst({
      where: { id: itemId, checklist: { task: { userId } } },
    });
    if (!item) throw new NotFoundException('Checklist item not found');

    return this.prisma.taskChecklistItem.update({
      where: { id: itemId },
      data: { isCompleted },
    });
  }

  // ==========================================
  // AUDIT TIMELINES
  // ==========================================

  async findRecentActivity(userId: string) {
    return this.prisma.taskHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        task: {
          select: { title: true },
        },
      },
    });
  }
}
