import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { TasksRepository } from './repositories/tasks.repository';
import { CreateWorkspaceDto } from './dto/workspace.dto';
import { CreateProjectDto } from './dto/project.dto';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { AiEngine } from '../ai/ai.engine';
import { TaskStatus, TaskPriority } from '@studysync/database';
import { PrismaService } from '../prisma/prisma.service';

// Services
import { WorkspaceService } from './services/workspace.service';
import { BoardService } from './services/board.service';
import { DependencyService } from './services/dependency.service';
import { AutomationService } from './services/automation.service';
import { EstimationService } from './services/estimation.service';
import { PriorityService } from './services/priority.service';
import { AnalyticsService } from './services/analytics.service';
import { CreateTimeLogDto } from './dto/create-time-log.dto';

import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class TasksService {
  constructor(
    private tasksRepo: TasksRepository,
    private aiEngine: AiEngine,
    private prisma: PrismaService,
    private workspaceService: WorkspaceService,
    private boardService: BoardService,
    private dependencyService: DependencyService,
    private automationService: AutomationService,
    private estimationService: EstimationService,
    private priorityService: PriorityService,
    private analyticsService: AnalyticsService,
    @InjectQueue('tasks-queue') private tasksQueue: Queue,
  ) {}

  // ==========================================
  // WORKSPACES
  // ==========================================

  async getWorkspaces(userId: string) {
    return this.workspaceService.getWorkspaces(userId);
  }

  async createWorkspace(userId: string, dto: CreateWorkspaceDto) {
    return this.workspaceService.createWorkspace(
      userId,
      dto.name,
      dto.description,
    );
  }

  // ==========================================
  // PROJECTS
  // ==========================================

  async getProjects(userId: string, workspaceId: string) {
    return this.workspaceService.getProjects(userId, workspaceId);
  }

  async createProject(userId: string, dto: CreateProjectDto) {
    return this.workspaceService.createProject(
      userId,
      dto.workspaceId,
      dto.name,
      dto.description,
      dto.dueDate ? new Date(dto.dueDate) : undefined,
    );
  }

  // ==========================================
  // SPRINTS & EPICS
  // ==========================================

  async getSprints(userId: string, workspaceId: string) {
    return this.workspaceService.getSprints(userId, workspaceId);
  }

  async createSprint(
    userId: string,
    workspaceId: string,
    name: string,
    startDate: Date,
    endDate: Date,
    goal?: string,
  ) {
    return this.workspaceService.createSprint(
      userId,
      workspaceId,
      name,
      startDate,
      endDate,
      goal,
    );
  }

  async getEpics(userId: string, workspaceId: string) {
    return this.workspaceService.getEpics(userId, workspaceId);
  }

  async createEpic(
    userId: string,
    workspaceId: string,
    name: string,
    description?: string,
    color?: string,
  ) {
    return this.workspaceService.createEpic(
      userId,
      workspaceId,
      name,
      description,
      color,
    );
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
    const task = await this.tasksRepo.createTask(userId, dto);
    // Queue background priority analysis
    await this.tasksQueue.add('calculate-priorities-bg', {
      userId,
      workspaceId: dto.workspaceId,
    });
    return task;
  }

  async updateTask(userId: string, taskId: string, dto: UpdateTaskDto) {
    const task = await this.tasksRepo.updateTask(userId, taskId, dto);
    // Recalculate priority dynamically
    await this.priorityService.calculatePriorityScore(userId, taskId);
    return task;
  }

  async deleteTask(userId: string, taskId: string) {
    return this.tasksRepo.deleteTask(userId, taskId);
  }

  // ==========================================
  // DRAG & DROP MOVEMENTS (Uses BoardService logic indirectly)
  // ==========================================

  async moveTask(
    userId: string,
    taskId: string,
    status: TaskStatus,
    order: number,
  ) {
    const task = await this.tasksRepo.findTaskById(userId, taskId);

    if (task.status !== status) {
      await this.prisma.task.updateMany({
        where: {
          userId,
          workspaceId: task.workspaceId,
          status: task.status,
          order: { gt: task.order },
        },
        data: { order: { decrement: 1 } },
      });

      await this.prisma.task.updateMany({
        where: {
          userId,
          workspaceId: task.workspaceId,
          status,
          order: { gte: order },
        },
        data: { order: { increment: 1 } },
      });

      return this.tasksRepo.updateTask(userId, taskId, { status, order });
    }

    if (task.order !== order) {
      if (order > task.order) {
        await this.prisma.task.updateMany({
          where: {
            userId,
            workspaceId: task.workspaceId,
            status,
            order: { gt: task.order, lte: order },
          },
          data: { order: { decrement: 1 } },
        });
      } else {
        await this.prisma.task.updateMany({
          where: {
            userId,
            workspaceId: task.workspaceId,
            status,
            order: { gte: order, lt: task.order },
          },
          data: { order: { increment: 1 } },
        });
      }

      return this.tasksRepo.updateTask(userId, taskId, { order });
    }

    return task;
  }

  // ==========================================
  // KANBAN COLUMNS
  // ==========================================

  async getKanbanColumns(
    userId: string,
    workspaceId: string,
    projectId?: string,
  ) {
    return this.boardService.getKanbanColumns(userId, workspaceId, projectId);
  }

  // ==========================================
  // DEPENDENCY CHECKS
  // ==========================================

  async checkDependencies(userId: string, taskId: string) {
    return this.dependencyService.checkDependencies(userId, taskId);
  }

  async getDependencyGraph(userId: string, workspaceId: string) {
    return this.dependencyService.getDependencyGraph(userId, workspaceId);
  }

  async addDependency(userId: string, taskId: string, dependsOnId: string) {
    return this.tasksRepo.addDependency(userId, taskId, dependsOnId);
  }

  async removeDependency(userId: string, taskId: string, dependsOnId: string) {
    return this.tasksRepo.removeDependency(userId, taskId, dependsOnId);
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
  // AI ESTIMATION & AUTOMATION
  // ==========================================

  async triggerAiBreakdown(userId: string, taskId: string) {
    return this.automationService.autoBreakdownTask(userId, taskId);
  }

  async estimateDuration(userId: string, taskId: string) {
    return this.estimationService.estimateDuration(userId, taskId);
  }

  async detectOverload(userId: string, workspaceId: string) {
    return this.automationService.detectOverload(userId, workspaceId);
  }

  // ==========================================
  // AI TASK GENERATION
  // ==========================================

  async generateTasksFromAi(
    userId: string,
    workspaceId: string,
    projectId?: string,
    sourceType?: string,
    sourceText?: string,
  ) {
    let contextPrompt = '';

    if (sourceType === 'WEAK_TOPICS') {
      const memory = await this.prisma.userMemory.findUnique({
        where: { userId },
      });
      if (memory && memory.weakTopics.length > 0) {
        contextPrompt = `Student's weak topics: ${memory.weakTopics.join(', ')}`;
      } else {
        contextPrompt = `Student wants general study tasks.`;
      }
    } else if (sourceText) {
      contextPrompt = `Source content: ${sourceText}`;
    } else {
      contextPrompt = `General academic goals.`;
    }

    const systemPrompt = `You are an elite academic planning assistant. Based on the provided context, generate 3 to 6 highly relevant, specific study tasks (e.g. "Master Binary Search Tree insertions", "Revise SQL joins"). 
Return JSON ONLY in the format: [{"title": "...", "description": "...", "priority": "HIGH" | "MEDIUM" | "LOW", "difficulty": "HARD" | "MEDIUM" | "EASY", "estimatedMinutes": 60}]`;

    const prompt = `Generate tasks for workspace context:\n${contextPrompt}`;

    const responseText = await this.aiEngine.generate(
      userId,
      'TASK_GENERATION',
      prompt,
      systemPrompt,
    );

    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    const tasksData: any[] = JSON.parse(
      jsonMatch ? jsonMatch[0] : responseText,
    );

    const createdTasks = [];
    for (const data of tasksData) {
      const task = await this.prisma.task.create({
        data: {
          userId,
          workspaceId,
          projectId: projectId || null,
          title: data.title,
          description: data.description || '',
          priority: data.priority || 'MEDIUM',
          difficulty: data.difficulty || 'MEDIUM',
          estimatedMinutes: data.estimatedMinutes || 60,
          status: 'TODO',
        },
      });
      createdTasks.push(task);
    }

    return createdTasks;
  }

  // ==========================================
  // TIME LOGS
  // ==========================================

  async addTimeLog(userId: string, dto: CreateTimeLogDto) {
    return this.prisma.timeLog.create({
      data: {
        taskId: dto.taskId,
        userId,
        durationMins: dto.durationMins,
        notes: dto.notes || '',
      },
    });
  }

  async getTimeLogs(userId: string, taskId: string) {
    return this.prisma.timeLog.findMany({
      where: { taskId, userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==========================================
  // FOCUS CONTEXT
  // ==========================================

  async getFocusContext(userId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, userId },
    });

    if (!task) return null;

    // Fetch related Tutor conversation or note
    const relatedNotes = await this.prisma.note.findFirst({
      where: { userId, title: { contains: task.title, mode: 'insensitive' } },
      select: { id: true, title: true },
    });

    const relatedQuiz = await this.prisma.quiz.findFirst({
      where: { userId, title: { contains: task.title, mode: 'insensitive' } },
      select: { id: true, title: true },
    });

    const relatedDoc = await this.prisma.document.findFirst({
      where: { userId, name: { contains: task.title, mode: 'insensitive' } },
      select: { id: true, name: true },
    });

    return {
      taskId: task.id,
      title: task.title,
      tutorConvId: task.tutorConvId || null,
      noteId: task.noteId || relatedNotes?.id || null,
      quizId: task.quizId || relatedQuiz?.id || null,
      documentId: task.documentId || relatedDoc?.id || null,
    };
  }

  // ==========================================
  // COMMENTS
  // ==========================================

  async addComment(userId: string, taskId: string, content: string) {
    return this.tasksRepo.addComment(userId, taskId, content);
  }

  // ==========================================
  // ANALYTICS & TIMELINES
  // ==========================================

  async getRecentActivity(userId: string) {
    return this.tasksRepo.findRecentActivity(userId);
  }

  async getAnalytics(userId: string, workspaceId: string) {
    return this.analyticsService.getWorkspaceAnalytics(userId, workspaceId);
  }

  async getBurnupChart(userId: string, workspaceId: string) {
    return this.analyticsService.getBurnupChart(userId, workspaceId);
  }
}
