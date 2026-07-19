import { Observable } from 'rxjs';

export interface GenOptions {
  temperature?: number;
  maxTokens?: number;
  responseMimeType?: string; // e.g., 'application/json' for structured output
}

export interface GenResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export interface AiProvider {
  generateText(
    prompt: string,
    systemInstruction?: string,
    options?: GenOptions,
  ): Promise<GenResult>;
  streamText(
    prompt: string,
    systemInstruction?: string,
    options?: GenOptions,
  ): Observable<string>;
}

export const AI_PROVIDER = 'AI_PROVIDER';
export default AiProvider;
