import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAiProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { LocalLlmProvider } from './providers/local-llm.provider';
import {
  AiProvider,
  GenOptions,
  GenResult,
} from './interfaces/ai-provider.interface';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'crypto';
import { Observable } from 'rxjs';

@Injectable()
export class AiEngine {
  private readonly logger = new Logger(AiEngine.name);

  constructor(
    private gemini: GeminiProvider,
    private openai: OpenAiProvider,
    private anthropic: AnthropicProvider,
    private localllm: LocalLlmProvider,
    private configService: ConfigService,
    private redis: RedisService,
    private prisma: PrismaService,
  ) {
    const key = this.configService.get<string>('GEMINI_API_KEY');
    this.logger.log(
      `[AI Engine] Constructor loaded. GEMINI_API_KEY slice(0,12): ${key?.slice(0, 12) || 'undefined'}`,
    );
  }

  private getProvider(): { provider: AiProvider; name: string } {
    const active =
      this.configService.get<string>('AI_PROVIDER_ACTIVE') || 'GEMINI';
    switch (active.toUpperCase()) {
      case 'OPENAI':
        return { provider: this.openai, name: 'OPENAI' };
      case 'ANTHROPIC':
        return { provider: this.anthropic, name: 'ANTHROPIC' };
      case 'LOCAL':
        return { provider: this.localllm, name: 'LOCAL' };
      default:
        return { provider: this.gemini, name: 'GEMINI' };
    }
  }

  private generateCacheKey(prompt: string, system?: string): string {
    const hash = createHash('sha256')
      .update(`${prompt}:${system || ''}`)
      .digest('hex');
    return `ai-cache:${hash}`;
  }

  // ==========================================
  // GENERATE CONTENT (WITH RETRIES & CACHE)
  // ==========================================

  async generate(
    userId: string,
    promptType: string,
    prompt: string,
    systemInstruction?: string,
    options?: GenOptions & { bypassCache?: boolean },
  ): Promise<string> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    const activeProvider =
      this.configService.get<string>('AI_PROVIDER_ACTIVE') || 'GEMINI';
    const modelName =
      this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash';

    console.log(
      `[AI Engine] API key loaded slice(0,12): ${apiKey?.slice(0, 12) || 'undefined'}`,
    );
    console.log(`[AI Engine] Model name: ${modelName}`);
    console.log(`[AI Engine] Prompt: ${prompt}`);

    const { provider, name: providerName } = this.getProvider();
    const cacheKey = this.generateCacheKey(prompt, systemInstruction);

    // 1. Try Redis cache lookup
    if (!options?.bypassCache) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        console.log(`[AI Engine] Cache hit for prompt type: ${promptType}`);
        console.log(`[AI Engine] Returned response: ${cached}`);
        return cached;
      }
    }

    const startTime = Date.now();
    let retries = 3;
    let delay = 1000;
    let lastError: any = null;

    console.log(`[AI Engine] SDK request started.`);

    // 2. Retry loop with exponential backoff
    while (retries > 0) {
      try {
        const result = await provider.generateText(
          prompt,
          systemInstruction,
          options,
        );
        const latencyMs = Date.now() - startTime;

        console.log(`[AI Engine] SDK response received.`);
        console.log(`[AI Engine] Generated text length: ${result.text.length}`);
        console.log(`[AI Engine] Returned response: ${result.text}`);

        // Save cache
        await this.redis.set(cacheKey, result.text, 86400); // 24 Hours cache duration

        // Log usage asynchronously
        this.logUsage(
          userId,
          providerName,
          promptType,
          result.inputTokens,
          result.outputTokens,
          latencyMs,
          true,
        );

        return result.text;
      } catch (e: any) {
        lastError = e;
        retries--;
        console.error(
          `[AI Engine] SDK request failed (retries left: ${retries}). Error: ${e.message}`,
        );
        if (retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        }
      }
    }

    const latencyMs = Date.now() - startTime;
    this.logUsage(
      userId,
      providerName,
      promptType,
      0,
      0,
      latencyMs,
      false,
      lastError?.message || 'Exhausted retries',
    );

    console.error(
      `[AI Engine] SDK request failed with error: ${lastError?.message}`,
    );
    throw new InternalServerErrorException(
      `AI Engine failed to generate content: ${lastError?.message}`,
    );
  }

  // ==========================================
  // STREAM TEXT CONTENT
  // ==========================================

  stream(
    prompt: string,
    systemInstruction?: string,
    options?: GenOptions,
  ): Observable<string> {
    const { provider } = this.getProvider();
    return provider.streamText(prompt, systemInstruction, options);
  }

  // ==========================================
  // USAGE PERSISTENCE
  // ==========================================

  private async logUsage(
    userId: string,
    provider: string,
    promptType: string,
    inputTokens: number,
    outputTokens: number,
    latencyMs: number,
    success: boolean,
    errorMsg?: string,
  ) {
    try {
      // Basic estimated cost calculation (e.g., $0.0001 per 1k input, $0.0003 per 1k output tokens)
      const costEst = (inputTokens * 0.0001 + outputTokens * 0.0003) / 1000;

      await this.prisma.aiUsageLog.create({
        data: {
          userId,
          provider,
          promptType,
          inputTokens,
          outputTokens,
          latencyMs,
          costEst,
          success,
          errorMessage: errorMsg || null,
        },
      });
    } catch (e: any) {
      this.logger.error(`Failed to write AI usage metric logs: ${e.message}`);
    }
  }
}
