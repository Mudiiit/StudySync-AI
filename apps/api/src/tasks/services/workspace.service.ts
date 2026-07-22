import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  // Workspaces
  async getWorkspaces(userId: string) {
    return this.prisma.taskWorkspace.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  async createWorkspace(userId: string, name: string, description?: string) {
    return this.prisma.taskWorkspace.create({
      data: { userId, name, description },
    });
  }

  // Projects & Health Score
  async getProjects(userId: string, workspaceId: string) {
    const projects = await this.prisma.taskProject.findMany({
      where: { workspaceId, workspace: { userId } },
      include: {
        tasks: {
          select: {
            id: true,
            isCompleted: true,
            dueDate: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Dynamically calculate project health score
    for (const p of projects) {
      let health = 100;
      const incompleteTasks = p.tasks.filter((t) => !t.isCompleted);
      const overdueTasks = incompleteTasks.filter(
        (t) => t.dueDate && t.dueDate < new Date(),
      );

      if (p.tasks.length > 0) {
        const overdueDeduction = overdueTasks.length * 15;
        const completionRatio =
          (p.tasks.filter((t) => t.isCompleted).length / p.tasks.length) * 100;
        health = Math.max(10, Math.round(completionRatio - overdueDeduction));
      }

      if (p.healthScore !== health) {
        await this.prisma.taskProject.update({
          where: { id: p.id },
          data: { healthScore: health },
        });
        p.healthScore = health;
      }
    }

    return projects;
  }

  async createProject(
    userId: string,
    workspaceId: string,
    name: string,
    description?: string,
    dueDate?: Date,
  ) {
    const ws = await this.prisma.taskWorkspace.findFirst({
      where: { id: workspaceId, userId },
    });
    if (!ws) throw new NotFoundException('Workspace not found');

    return this.prisma.taskProject.create({
      data: {
        workspaceId,
        name,
        description,
        dueDate,
      },
    });
  }

  // Sprints
  async getSprints(userId: string, workspaceId: string) {
    return this.prisma.sprint.findMany({
      where: { workspaceId, userId },
      orderBy: { startDate: 'asc' },
    });
  }

  async createSprint(
    userId: string,
    workspaceId: string,
    name: string,
    startDate: Date,
    endDate: Date,
    goal?: string,
  ) {
    return this.prisma.sprint.create({
      data: {
        workspaceId,
        userId,
        name,
        startDate,
        endDate,
        goal,
      },
    });
  }

  // Epics
  async getEpics(userId: string, workspaceId: string) {
    return this.prisma.epic.findMany({
      where: { workspaceId, userId },
      orderBy: { name: 'asc' },
    });
  }

  async createEpic(
    userId: string,
    workspaceId: string,
    name: string,
    description?: string,
    color?: string,
  ) {
    return this.prisma.epic.create({
      data: {
        workspaceId,
        userId,
        name,
        description,
        color: color || '#7c3aed',
      },
    });
  }
}
