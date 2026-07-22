import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiEngine } from '../../ai/ai.engine';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiEngine: AiEngine,
  ) {}

  async autoBreakdownTask(userId: string, taskId: string): Promise<any> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, userId },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    const systemPrompt = `You are a productivity automation expert. Break down the task into 3-6 distinct subtask steps. 
Return JSON ONLY in the format: ["Step 1 title", "Step 2 title", ...]`;

    const prompt = `Task: ${task.title}\nDescription: ${task.description || 'No description'}`;

    try {
      const responseText = await this.aiEngine.generate(
        userId,
        'TASK_AUTOMATION_BREAKDOWN',
        prompt,
        systemPrompt,
      );

      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      const steps: string[] = JSON.parse(
        jsonMatch ? jsonMatch[0] : responseText,
      );

      // Create checklist
      const checklist = await this.prisma.taskChecklist.create({
        data: {
          taskId,
          title: 'AI Subtask Decomposition',
        },
      });

      const items = [];
      for (let i = 0; i < steps.length; i++) {
        const item = await this.prisma.taskChecklistItem.create({
          data: {
            checklistId: checklist.id,
            title: steps[i],
            order: i,
          },
        });
        items.push(item);
      }

      await this.prisma.taskActivity.create({
        data: {
          taskId,
          userId,
          description: `AI auto-decomposed task into ${steps.length} checklist items.`,
        },
      });

      return { checklist, items };
    } catch (e: any) {
      this.logger.error(`AI Task breakdown failed: ${e.message}`);
      throw e;
    }
  }

  async handleOverdueTasks(
    userId: string,
    workspaceId: string,
  ): Promise<number> {
    const now = new Date();
    const overdueTasks = await this.prisma.task.findMany({
      where: {
        userId,
        workspaceId,
        isCompleted: false,
        inTrash: false,
        dueDate: { lt: now },
      },
    });

    for (const t of overdueTasks) {
      // Shift due date to tomorrow or next available slot
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await this.prisma.task.update({
        where: { id: t.id },
        data: { dueDate: tomorrow },
      });

      await this.prisma.taskActivity.create({
        data: {
          taskId: t.id,
          userId,
          description: `Overdue task automatically rolled forward to ${tomorrow.toLocaleDateString()}.`,
        },
      });
    }

    return overdueTasks.length;
  }

  async detectOverload(
    userId: string,
    workspaceId: string,
  ): Promise<{ isOverloaded: boolean; message?: string }> {
    const inProgressCount = await this.prisma.task.count({
      where: {
        userId,
        workspaceId,
        status: 'IN_PROGRESS',
        isCompleted: false,
        inTrash: false,
      },
    });

    if (inProgressCount > 5) {
      return {
        isOverloaded: true,
        message: `High cognitive load detected: You have ${inProgressCount} tasks currently marked "In Progress". Focus on completing them before starting new ones.`,
      };
    }

    return { isOverloaded: false };
  }
}
