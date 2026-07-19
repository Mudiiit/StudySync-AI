import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class EmbeddingsService {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(private configService: ConfigService) {
    const apiKey =
      this.configService.get<string>('GEMINI_API_KEY') || 'placeholder_key';
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName =
      this.configService.get<string>('EMBEDDING_MODEL') ||
      'gemini-embedding-001';
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const provider =
      this.configService.get<string>('AI_PROVIDER_ACTIVE') || 'GEMINI';

    if (provider.toUpperCase() !== 'GEMINI') {
      // Return 1536 length random vector for OpenAI/Anthropic mocks compatibility
      return Array.from({ length: 1536 }, () => Math.random());
    }

    const maxRetries = 3;
    let delay = 2000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const model = this.genAI.getGenerativeModel({ model: this.modelName });
        const result = await model.embedContent(text);
        return result.embedding.values;
      } catch (e: any) {
        const isRateLimit =
          e.message?.includes('429') ||
          e.message?.toLowerCase().includes('quota') ||
          e.message?.toLowerCase().includes('exhausted') ||
          e.message?.toLowerCase().includes('rate limit');

        if (isRateLimit && attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2.5;
          continue;
        }

        if (isRateLimit) {
          console.warn(
            `[EmbeddingsService] Rate limit hit on Gemini. Falling back to mock embedding vector for node stability.`,
          );
          return Array.from({ length: 3072 }, () => Math.random());
        }

        throw new InternalServerErrorException(
          `Gemini Embedding Error: ${e.message}`,
        );
      }
    }

    return Array.from({ length: 3072 }, () => Math.random());
  }
}
