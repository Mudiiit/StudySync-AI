import { Injectable, Logger } from '@nestjs/common';
import { AiEngine } from '../ai.engine';
import { PromptService } from '../prompt.service';

@Injectable()
export class TaskOptimizerService {
  private readonly logger = new Logger(TaskOptimizerService.name);

  constructor(
    private aiEngine: AiEngine,
    private promptService: PromptService,
  ) {}

  async breakdownTask(
    userId: string,
    title: string,
    description: string,
  ): Promise<string[]> {
    const prompt = await this.promptService.getRenderedPrompt(
      'TASK_BREAKDOWN',
      {
        title,
        description: description || 'No description provided.',
      },
    );

    try {
      const response = await this.aiEngine.generate(
        userId,
        'TASK_BREAKDOWN',
        prompt,
        'You are an expert scrum PM. Break down tasks into checklist items.',
        { responseMimeType: 'application/json' },
      );

      const cleaned = response
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      return JSON.parse(cleaned);
    } catch (e: any) {
      this.logger.warn(`Failed to parse task breakdown response: ${e.message}`);
      return ['Define objectives', 'Execute steps', 'Review results'];
    }
  }
}
