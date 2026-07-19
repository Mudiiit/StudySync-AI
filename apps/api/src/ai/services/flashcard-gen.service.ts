import { Injectable, Logger } from '@nestjs/common';
import { AiEngine } from '../ai.engine';
import { PromptService } from '../prompt.service';

@Injectable()
export class FlashcardGenService {
  private readonly logger = new Logger(FlashcardGenService.name);

  constructor(
    private aiEngine: AiEngine,
    private promptService: PromptService,
  ) {}

  async generateFlashcards(userId: string, topic: string): Promise<any[]> {
    const prompt = await this.promptService.getRenderedPrompt('FLASHCARDS', {
      topic,
    });

    try {
      const response = await this.aiEngine.generate(
        userId,
        'FLASHCARD_GENERATION',
        prompt,
        'You are an expert tutor formatting study aids. Return ONLY raw JSON array formats.',
        { responseMimeType: 'application/json' },
      );

      const cleaned = response
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      return JSON.parse(cleaned);
    } catch (e: any) {
      this.logger.warn(`Failed to parse flashcards response: ${e.message}`);
      return [];
    }
  }
}
