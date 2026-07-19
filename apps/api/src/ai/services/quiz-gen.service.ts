import { Injectable, Logger } from '@nestjs/common';
import { AiEngine } from '../ai.engine';
import { PromptService } from '../prompt.service';

@Injectable()
export class QuizGenService {
  private readonly logger = new Logger(QuizGenService.name);

  constructor(
    private aiEngine: AiEngine,
    private promptService: PromptService,
  ) {}

  async generateQuiz(
    userId: string,
    topic: string,
    count = 5,
    difficulty = 'medium',
  ): Promise<any[]> {
    const prompt = await this.promptService.getRenderedPrompt(
      'QUIZ_GENERATOR',
      {
        topic,
        count: String(count),
        difficulty,
      },
    );

    try {
      const response = await this.aiEngine.generate(
        userId,
        'QUIZ_GENERATION',
        prompt,
        'You are an examiner generating tests. Return ONLY raw JSON array formats.',
        { responseMimeType: 'application/json' },
      );

      const cleaned = response
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      return JSON.parse(cleaned);
    } catch (e: any) {
      this.logger.warn(`Failed to parse quiz response: ${e.message}`);
      return [];
    }
  }
}
