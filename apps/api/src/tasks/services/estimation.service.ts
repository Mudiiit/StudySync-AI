import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiEngine } from '../../ai/ai.engine';

@Injectable()
export class EstimationService {
  private readonly logger = new Logger(EstimationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiEngine: AiEngine,
  ) {}

  async estimateDuration(userId: string, taskId: string): Promise<number> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, userId },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    const systemPrompt = `You are a productivity estimation bot. Return ONLY a single integer representing estimated study minutes (e.g. 45, 90, 120) for the given task. No explanations, no text units.`;
    const prompt = `Title: ${task.title}\nDescription: ${task.description || 'No description'}\nDifficulty: ${task.difficulty || 'MEDIUM'}`;

    try {
      const responseText = await this.aiEngine.generate(
        userId,
        'TASK_ESTIMATION',
        prompt,
        systemPrompt,
      );

      const parsed = parseInt(responseText.trim().replace(/[^\d]/g, ''), 10);
      const estMinutes = isNaN(parsed) ? 60 : parsed;

      await this.prisma.task.update({
        where: { id: taskId },
        data: { estimatedMinutes: estMinutes },
      });

      return estMinutes;
    } catch (e: any) {
      this.logger.error(`AI Task duration estimation failed: ${e.message}`);
      return 60; // fallback to 1 hour
    }
  }
}
