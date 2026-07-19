import { Injectable, Logger } from '@nestjs/common';
import { AiEngine } from '../ai/ai.engine';

@Injectable()
export class FlashcardAiService {
  private readonly logger = new Logger(FlashcardAiService.name);

  constructor(private aiEngine: AiEngine) {}

  async generateCards(
    userId: string,
    content: string,
    type: 'recall' | 'conceptual' | 'scenario' | 'interview' = 'recall',
    quantity: number = 5,
  ): Promise<any[]> {
    const styleDescription = {
      recall:
        'focused on factual recall, definitions, terminology, and direct questions',
      conceptual:
        'focused on core concepts, relationships between ideas, and understanding underlying principles',
      scenario:
        'focused on application of knowledge in specific scenarios, case studies, or problem-solving contexts',
      interview:
        'focused on interview questions, explanation of techniques, trade-offs, and conceptual walkthroughs',
    }[type];

    const prompt = `
Generate a list of exactly ${quantity} study flashcards based on the source text below.
Style of Flashcards: ${styleDescription}.

Return ONLY a valid JSON array of objects matching the schema below. Do not wrap the JSON in \`\`\`json markdown blocks or output any conversational text.

JSON Schema:
[
  {
    "question": "Clear and concise card question",
    "answer": "Accurate, comprehensive answer to the question",
    "hint": "Optional brief hint to help recall the answer (optional, or null)",
    "explanation": "Detailed explanation containing background context, reasoning, or references",
    "difficulty": "easy" | "medium" | "hard",
    "tags": ["tag1", "tag2"]
  }
]

Source Text:
${content}
`;

    console.log('[FlashcardAiService] Preparing Gemini generation request:');
    console.log(' - note length:', content.length);
    console.log(' - first 300 characters:', content.slice(0, 300));
    console.log(' - prompt length:', prompt.length);

    try {
      this.logger.log(
        `[Flashcard AI] Generating ${quantity} ${type} cards for user ${userId}...`,
      );
      const response = await this.aiEngine.generate(
        userId,
        'FLASHCARD_GENERATION',
        prompt,
        'You are an expert educational tutor. Output ONLY raw JSON lists matching the requested schema.',
        { responseMimeType: 'application/json', bypassCache: true },
      );

      console.log(
        '[FlashcardAiService] Gemini response returned. Cleaning/parsing JSON...',
      );
      const cleaned = response
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      const cards = JSON.parse(cleaned);

      console.log('[FlashcardAiService] Parsed cards count:', cards.length);
      console.log(
        '[FlashcardAiService] Generated cards details:',
        JSON.stringify(cards, null, 2),
      );

      if (!Array.isArray(cards)) {
        throw new Error('Response is not a JSON array');
      }

      // Verify question/answer pairs
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        if (!card.question || !card.answer) {
          console.error(
            `[FlashcardAiService] Warning: Card at index ${i} is missing question or answer!`,
            card,
          );
          card.question = card.question || 'Missing Question';
          card.answer = card.answer || 'Missing Answer';
        }
      }

      return cards;
    } catch (err: any) {
      this.logger.error(`[Flashcard AI] Generation failed: ${err.message}`);
      throw err;
    }
  }
}
