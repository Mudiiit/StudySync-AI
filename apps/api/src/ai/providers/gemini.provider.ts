import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiProvider,
  GenOptions,
  GenResult,
} from '../interfaces/ai-provider.interface';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Observable } from 'rxjs';

@Injectable()
export class GeminiProvider implements AiProvider {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(private configService: ConfigService) {
    const apiKey =
      this.configService.get<string>('GEMINI_API_KEY') || 'placeholder_key';
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName =
      this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash';
  }

  async generateText(
    prompt: string,
    systemInstruction?: string,
    options?: GenOptions,
  ): Promise<GenResult> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        systemInstruction,
        generationConfig: {
          temperature: options?.temperature,
          maxOutputTokens: options?.maxTokens,
          responseMimeType: options?.responseMimeType,
        },
      });

      const result = await model.generateContent(prompt);
      const response = result.response;

      const inputTokens =
        response.usageMetadata?.promptTokenCount ||
        Math.ceil(prompt.length / 4);
      const outputTokens =
        response.usageMetadata?.candidatesTokenCount ||
        Math.ceil(response.text().length / 4);

      return {
        text: response.text(),
        inputTokens,
        outputTokens,
      };
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Gemini API Error: ${error.message}`,
      );
    }
  }

  streamText(
    prompt: string,
    systemInstruction?: string,
    options?: GenOptions,
  ): Observable<string> {
    return new Observable<string>((subscriber) => {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        systemInstruction,
        generationConfig: {
          temperature: options?.temperature,
          maxOutputTokens: options?.maxTokens,
          responseMimeType: options?.responseMimeType,
        },
      });

      model
        .generateContentStream({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        })
        .then(async (result) => {
          try {
            for await (const chunk of result.stream) {
              const text = chunk.text();
              subscriber.next(text);
            }
            subscriber.complete();
          } catch (err: any) {
            subscriber.error(
              new InternalServerErrorException(
                `Gemini stream iteration failed: ${err.message}`,
              ),
            );
          }
        })
        .catch((err: any) => {
          subscriber.error(
            new InternalServerErrorException(
              `Gemini API stream connection error: ${err.message}`,
            ),
          );
        });
    });
  }
}
