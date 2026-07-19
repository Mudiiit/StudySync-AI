import { Injectable } from '@nestjs/common';
import { TasksRepository } from './repositories/tasks.repository';
import { CreateWorkspaceDto } from './dto/workspace.dto';
import { CreateProjectDto } from './dto/project.dto';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { AiService } from '../ai/ai.service';
import { TaskStatus, TaskPriority } from '@studysync/database';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TasksService {
  constructor(
    private tasksRepo: TasksRepository,
    private aiService: AiService,
    private prisma: PrismaService,
  ) {}

  // ==========================================
  // WORKSPACES
  // ==========================================

  async getWorkspaces(userId: string) {
    return this.tasksRepo.findWorkspacesByUser(userId);
  }

  async createWorkspace(userId: string, dto: CreateWorkspaceDto) {
    return this.tasksRepo.createWorkspace(userId, dto);
  }

  // ==========================================
  // PROJECTS
  // ==========================================

  async getProjects(userId: string, workspaceId: string) {
    return this.tasksRepo.findProjectsByWorkspace(userId, workspaceId);
  }

  async createProject(userId: string, dto: CreateProjectDto) {
    return this.tasksRepo.createProject(userId, dto);
  }

  // ==========================================
  // TASKS CRUD
  // ==========================================

  async getTasks(
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
    return this.tasksRepo.findTasks(userId, filters);
  }

  async getTask(userId: string, taskId: string) {
    return this.tasksRepo.findTaskById(userId, taskId);
  }

  async createTask(userId: string, dto: CreateTaskDto) {
    return this.tasksRepo.createTask(userId, dto);
  }

  async updateTask(userId: string, taskId: string, dto: UpdateTaskDto) {
    return this.tasksRepo.updateTask(userId, taskId, dto);
  }

  async deleteTask(userId: string, taskId: string) {
    return this.tasksRepo.deleteTask(userId, taskId);
  }

  // ==========================================
  // DRAG & DROP MOVEMENTS
  // ==========================================

  async moveTask(
    userId: string,
    taskId: string,
    status: TaskStatus,
    order: number,
  ) {
    const task = await this.tasksRepo.findTaskById(userId, taskId);

    // If changing columns (status change)
    if (task.status !== status) {
      // 1. Shift tasks in old column down
      await this.prisma.task.updateMany({
        where: {
          userId,
          workspaceId: task.workspaceId,
          status: task.status,
          order: { gt: task.order },
        },
        data: {
          order: { decrement: 1 },
        },
      });

      // 2. Shift tasks in new column up to make room
      await this.prisma.task.updateMany({
        where: {
          userId,
          workspaceId: task.workspaceId,
          status,
          order: { gte: order },
        },
        data: {
          order: { increment: 1 },
        },
      });

      // 3. Move target task
      return this.tasksRepo.updateTask(userId, taskId, { status, order });
    }

    // If reordering inside the same column
    if (task.order !== order) {
      if (order > task.order) {
        await this.prisma.task.updateMany({
          where: {
            userId,
            workspaceId: task.workspaceId,
            status,
            order: { gt: task.order, lte: order },
          },
          data: {
            order: { decrement: 1 },
          },
        });
      } else {
        await this.prisma.task.updateMany({
          where: {
            userId,
            workspaceId: task.workspaceId,
            status,
            order: { gte: order, lt: task.order },
          },
          data: {
            order: { increment: 1 },
          },
        });
      }

      return this.tasksRepo.updateTask(userId, taskId, { order });
    }

    return task;
  }

  // ==========================================
  // CHECKLISTS
  // ==========================================

  async createChecklist(userId: string, taskId: string, title: string) {
    return this.tasksRepo.createChecklist(userId, taskId, title);
  }

  async addChecklistItem(userId: string, checklistId: string, title: string) {
    return this.tasksRepo.addChecklistItem(userId, checklistId, title);
  }

  async toggleChecklistItem(
    userId: string,
    itemId: string,
    isCompleted: boolean,
  ) {
    return this.tasksRepo.toggleChecklistItem(userId, itemId, isCompleted);
  }

  // ==========================================
  // DEPENDENCIES
  // ==========================================

  async addDependency(userId: string, taskId: string, dependsOnId: string) {
    return this.tasksRepo.addDependency(userId, taskId, dependsOnId);
  }

  async removeDependency(userId: string, taskId: string, dependsOnId: string) {
    return this.tasksRepo.removeDependency(userId, taskId, dependsOnId);
  }

  // ==========================================
  // COMMENTS
  // ==========================================

  async addComment(userId: string, taskId: string, content: string) {
    return this.tasksRepo.addComment(userId, taskId, content);
  }

  // ==========================================
  // AI BREAKDOWNS
  // ==========================================

  async triggerAiBreakdown(userId: string, taskId: string) {
    const task = await this.tasksRepo.findTaskById(userId, taskId);

    // Generate subtasks list from Gemini
    const subtaskTitles = await this.aiService.taskBreakdown(
      task.title,
      task.description || 'No description provided',
    );

    // Create a checklist group
    const checklist = await this.createChecklist(
      userId,
      taskId,
      'AI Breakdown Steps',
    );

    // Create each item in database
    const items = [];
    for (const title of subtaskTitles) {
      const item = await this.addChecklistItem(userId, checklist.id, title);
      items.push(item);
    }

    return { ...checklist, items };
  }

  // ==========================================
  // ANALYTICS & TIMELINES
  // ==========================================

  async getRecentActivity(userId: string) {
    return this.tasksRepo.findRecentActivity(userId);
  }

  async getAnalytics(userId: string, workspaceId: string) {
    const tasks = await this.prisma.task.findMany({
      where: { userId, workspaceId, inTrash: false },
    });

    const total = tasks.length;
    const completed = tasks.filter((t) => t.isCompleted).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const priorities = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
    const statuses = { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 };

    tasks.forEach((t) => {
      priorities[t.priority]++;
      statuses[t.status]++;
    });

    return {
      totalTasks: total,
      completedTasks: completed,
      completionRate: rate,
      priorityDistribution: priorities,
      statusDistribution: statuses,
    };
  }
}
