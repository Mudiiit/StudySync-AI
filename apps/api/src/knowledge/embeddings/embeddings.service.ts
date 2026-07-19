import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeminiEmbeddingProvider } from './providers/gemini.provider';
import { OpenAIEmbeddingProvider } from './providers/openai.provider';
import { EmbeddingProvider } from './interfaces/embedding-provider.interface';

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private activeProvider: EmbeddingProvider;

  constructor(
    private configService: ConfigService,
    private geminiProvider: GeminiEmbeddingProvider,
    private openaiProvider: OpenAIEmbeddingProvider,
  ) {
    const providerName = (
      this.configService.get<string>('AI_PROVIDER_ACTIVE') || 'GEMINI'
    ).toUpperCase();
    if (providerName === 'OPENAI') {
      this.activeProvider = this.openaiProvider;
      this.logger.log('Active Embedding Provider: OpenAI');
    } else {
      this.activeProvider = this.geminiProvider;
      this.logger.log('Active Embedding Provider: Gemini');
    }
  }

  async generate(text: string): Promise<number[]> {
    return this.activeProvider.generate(text);
  }

  async generateBatch(texts: string[]): Promise<number[][]> {
    return this.activeProvider.generateBatch(texts);
  }

  getDimensions(): number {
    return this.activeProvider.getDimensions();
  }
}
