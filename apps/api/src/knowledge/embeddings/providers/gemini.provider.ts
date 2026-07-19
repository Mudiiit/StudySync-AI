import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { EmbeddingProvider } from '../interfaces/embedding-provider.interface';

@Injectable()
export class GeminiEmbeddingProvider implements EmbeddingProvider {
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

  async generate(text: string): Promise<number[]> {
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
          return Array.from({ length: this.getDimensions() }, () =>
            Math.random(),
          );
        }

        throw new InternalServerErrorException(
          `Gemini Embedding Error: ${e.message}`,
        );
      }
    }

    return Array.from({ length: this.getDimensions() }, () => Math.random());
  }

  async generateBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.generate(t)));
  }

  getDimensions(): number {
    return 768;
  }
}
