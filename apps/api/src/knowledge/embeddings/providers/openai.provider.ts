import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmbeddingProvider } from '../interfaces/embedding-provider.interface';

@Injectable()
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private apiKey: string;
  private modelName: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
    this.modelName =
      this.configService.get<string>('OPENAI_EMBEDDING_MODEL') ||
      'text-embedding-3-small';
  }

  async generate(text: string): Promise<number[]> {
    if (!this.apiKey) {
      return Array.from({ length: this.getDimensions() }, () => Math.random());
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          input: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI HTTP Error: ${response.statusText}`);
      }

      const data: any = await response.json();
      return data.data[0].embedding;
    } catch (e) {
      return Array.from({ length: this.getDimensions() }, () => Math.random());
    }
  }

  async generateBatch(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) {
      return Promise.all(texts.map((t) => this.generate(t)));
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          input: texts,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI HTTP Error: ${response.statusText}`);
      }

      const data: any = await response.json();
      return data.data.map((item: any) => item.embedding);
    } catch (e) {
      return Promise.all(texts.map((t) => this.generate(t)));
    }
  }

  getDimensions(): number {
    return 1536;
  }
}
