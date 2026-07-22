import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiEngine } from '../../ai/ai.engine';

@Injectable()
export class PriorityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiEngine: AiEngine,
  ) {}

  async calculatePriorityScore(
    userId: string,
    taskId: string,
  ): Promise<number> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, userId },
      include: {
        project: true,
      },
    });

    if (!task) {
      return 50;
    }

    // 1. Urgency (closeness to due date)
    let urgency = 50;
    if (task.dueDate) {
      const now = new Date();
      const diffTime = task.dueDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) {
        urgency = 100;
      } else if (diffDays <= 1) {
        urgency = 95;
      } else if (diffDays <= 3) {
        urgency = 80;
      } else if (diffDays <= 7) {
        urgency = 60;
      } else if (diffDays <= 14) {
        urgency = 40;
      } else {
        urgency = 20;
      }
    }

    // 2. Importance
    let importance = 50;
    if (task.priority === 'URGENT') importance = 100;
    else if (task.priority === 'HIGH') importance = 75;
    else if (task.priority === 'MEDIUM') importance = 50;
    else if (task.priority === 'LOW') importance = 25;

    // 3. Difficulty
    let difficulty = 50;
    if (task.difficulty === 'HARD') difficulty = 80;
    else if (task.difficulty === 'MEDIUM') difficulty = 50;
    else if (task.difficulty === 'EASY') difficulty = 20;

    // 4. Exam Relevance & Knowledge gap from UserMemory
    let examRelevance = 50;
    let knowledgeGap = 50;

    const memory = await this.prisma.userMemory.findUnique({
      where: { userId },
    });

    if (memory) {
      const isWeak = memory.weakTopics.some(
        (t) =>
          task.title.toLowerCase().includes(t.toLowerCase()) ||
          (task.description &&
            task.description.toLowerCase().includes(t.toLowerCase())),
      );
      if (isWeak) {
        knowledgeGap = 90;
      }

      const isGoal = memory.goals.some(
        (g) =>
          task.title.toLowerCase().includes(g.toLowerCase()) ||
          (task.description &&
            task.description.toLowerCase().includes(g.toLowerCase())),
      );
      if (isGoal) {
        examRelevance = 80;
      }
    }

    // Formula: Urgency (25%), Importance (25%), Difficulty (20%), ExamRelevance (20%), KnowledgeGap (10%)
    const score =
      urgency * 0.25 +
      importance * 0.25 +
      difficulty * 0.2 +
      examRelevance * 0.2 +
      knowledgeGap * 0.1;

    const finalScore = Math.min(100, Math.max(0, Math.round(score)));

    await this.prisma.task.update({
      where: { id: taskId },
      data: { aiPriorityScore: finalScore },
    });

    return finalScore;
  }

  async runAiPrioritization(
    userId: string,
    workspaceId: string,
  ): Promise<void> {
    const tasks = await this.prisma.task.findMany({
      where: { userId, workspaceId, isCompleted: false, inTrash: false },
    });

    for (const task of tasks) {
      await this.calculatePriorityScore(userId, task.id);
    }
  }
}
