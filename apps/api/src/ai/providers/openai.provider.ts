import { Injectable } from '@nestjs/common';
import {
  AiProvider,
  GenOptions,
  GenResult,
} from '../interfaces/ai-provider.interface';
import { Observable, of } from 'rxjs';

@Injectable()
export class OpenAiProvider implements AiProvider {
  async generateText(
    prompt: string,
    systemInstruction?: string,
    options?: GenOptions,
  ): Promise<GenResult> {
    // Architecture-ready mock implementation simulating latency
    await new Promise((resolve) => setTimeout(resolve, 300));
    const text = `[Mock OpenAI Response] for prompt: "${prompt}"`;
    return {
      text,
      inputTokens: Math.ceil(prompt.length / 4),
      outputTokens: Math.ceil(text.length / 4),
    };
  }

  streamText(
    prompt: string,
    systemInstruction?: string,
    options?: GenOptions,
  ): Observable<string> {
    return of('[Mock OpenAI Stream Response]');
  }
}
