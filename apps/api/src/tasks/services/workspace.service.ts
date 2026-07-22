import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  // Workspaces
  async getWorkspaces(userId: string, includeArchived = false) {
    return this.prisma.taskWorkspace.findMany({
      where: {
        userId,
        deletedAt: null,
        isArchived: includeArchived ? undefined : false,
      },
      orderBy: { name: 'asc' },
    });
  }

  async createWorkspace(userId: string, name: string, description?: string) {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 50) {
      throw new BadRequestException(
        'Workspace name must be between 1 and 50 characters',
      );
    }

    const existing = await this.prisma.taskWorkspace.findFirst({
      where: { userId, name: trimmed, deletedAt: null },
    });
    if (existing) {
      throw new BadRequestException(
        'A workspace with this name already exists',
      );
    }

    return this.prisma.taskWorkspace.create({
      data: { userId, name: trimmed, description },
    });
  }

  async updateWorkspace(
    userId: string,
    id: string,
    name: string,
    description?: string,
  ) {
    const ws = await this.prisma.taskWorkspace.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!ws) throw new NotFoundException('Workspace not found');

    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 50) {
      throw new BadRequestException(
        'Workspace name must be between 1 and 50 characters',
      );
    }

    if (trimmed !== ws.name) {
      const duplicate = await this.prisma.taskWorkspace.findFirst({
        where: { userId, name: trimmed, deletedAt: null },
      });
      if (duplicate) {
        throw new BadRequestException(
          'A workspace with this name already exists',
        );
      }
    }

    return this.prisma.taskWorkspace.update({
      where: { id },
      data: { name: trimmed, description },
    });
  }

  async archiveWorkspace(userId: string, id: string) {
    const ws = await this.prisma.taskWorkspace.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!ws) throw new NotFoundException('Workspace not found');

    return this.prisma.taskWorkspace.update({
      where: { id },
      data: { isArchived: true },
    });
  }

  async restoreWorkspace(userId: string, id: string) {
    const ws = await this.prisma.taskWorkspace.findFirst({
      where: { id, userId },
    });
    if (!ws) throw new NotFoundException('Workspace not found');

    return this.prisma.taskWorkspace.update({
      where: { id },
      data: { isArchived: false, deletedAt: null },
    });
  }

  async deleteWorkspace(userId: string, id: string) {
    const ws = await this.prisma.taskWorkspace.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!ws) throw new NotFoundException('Workspace not found');

    // Perform soft delete inside transaction
    return this.prisma.$transaction(async (tx) => {
      // Cascade delete: soft-delete tasks & projects by setting deletedAt or deleting permanently
      // Since Tasks only have isCompleted / status / inTrash, we can soft-delete workspace
      return tx.taskWorkspace.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
  }

  async duplicateWorkspace(userId: string, id: string) {
    const ws = await this.prisma.taskWorkspace.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        projects: true,
        epics: true,
        sprints: true,
        tasks: {
          include: {
            checklists: {
              include: {
                items: true,
              },
            },
          },
        },
      },
    });

    if (!ws) throw new NotFoundException('Workspace not found');

    const duplicateName = `Copy of ${ws.name}`;

    return this.prisma.$transaction(async (tx) => {
      const newWs = await tx.taskWorkspace.create({
        data: {
          userId,
          name: duplicateName,
          description: ws.description,
        },
      });

      // Epics map
      const epicMap = new Map<string, string>();
      for (const e of ws.epics) {
        const newEpic = await tx.epic.create({
          data: {
            workspaceId: newWs.id,
            userId,
            name: e.name,
            description: e.description,
            color: e.color,
            status: e.status,
          },
        });
        epicMap.set(e.id, newEpic.id);
      }

      // Sprints map
      const sprintMap = new Map<string, string>();
      for (const s of ws.sprints) {
        const newSprint = await tx.sprint.create({
          data: {
            workspaceId: newWs.id,
            userId,
            name: s.name,
            goal: s.goal,
            startDate: s.startDate,
            endDate: s.endDate,
            status: s.status,
          },
        });
        sprintMap.set(s.id, newSprint.id);
      }

      // Projects map
      const projectMap = new Map<string, string>();
      for (const p of ws.projects) {
        const newProj = await tx.taskProject.create({
          data: {
            workspaceId: newWs.id,
            name: p.name,
            description: p.description,
            status: p.status,
            dueDate: p.dueDate,
            healthScore: p.healthScore,
          },
        });
        projectMap.set(p.id, newProj.id);
      }

      // Tasks
      for (const t of ws.tasks) {
        const newT = await tx.task.create({
          data: {
            userId,
            workspaceId: newWs.id,
            projectId: t.projectId ? projectMap.get(t.projectId) || null : null,
            epicId: t.epicId ? epicMap.get(t.epicId) || null : null,
            sprintId: t.sprintId ? sprintMap.get(t.sprintId) || null : null,
            title: t.title,
            description: t.description,
            status: t.status,
            priority: t.priority,
            difficulty: t.difficulty,
            aiPriorityScore: t.aiPriorityScore,
            dueDate: t.dueDate,
            estimatedMinutes: t.estimatedMinutes,
            actualMinutes: t.actualMinutes,
            isCompleted: t.isCompleted,
            order: t.order,
          },
        });

        for (const chk of t.checklists) {
          const newChk = await tx.taskChecklist.create({
            data: {
              taskId: newT.id,
              title: chk.title,
            },
          });
          for (const item of chk.items) {
            await tx.taskChecklistItem.create({
              data: {
                checklistId: newChk.id,
                title: item.title,
                isCompleted: item.isCompleted,
                order: item.order,
              },
            });
          }
        }
      }

      return newWs;
    });
  }

  // Projects & Health Score
  async getProjects(userId: string, workspaceId: string) {
    const projects = await this.prisma.taskProject.findMany({
      where: { workspaceId, workspace: { userId, deletedAt: null } },
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
      where: { id: workspaceId, userId, deletedAt: null },
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
      where: { workspaceId, userId, workspace: { deletedAt: null } },
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
    const ws = await this.prisma.taskWorkspace.findFirst({
      where: { id: workspaceId, userId, deletedAt: null },
    });
    if (!ws) throw new NotFoundException('Workspace not found');

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
      where: { workspaceId, userId, workspace: { deletedAt: null } },
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
    const ws = await this.prisma.taskWorkspace.findFirst({
      where: { id: workspaceId, userId, deletedAt: null },
    });
    if (!ws) throw new NotFoundException('Workspace not found');

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
