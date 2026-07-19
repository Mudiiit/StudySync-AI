import { Test, TestingModule } from '@nestjs/testing';
import { AiEngine } from './ai.engine';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAiProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { LocalLlmProvider } from './providers/local-llm.provider';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AiEngine', () => {
  let engine: AiEngine;

  const mockProvider = {
    generateText: jest.fn().mockResolvedValue({
      text: 'Mocked output',
      inputTokens: 10,
      outputTokens: 20,
    }),
  };

  const mockRedisService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn(),
  };

  const mockPrismaService = {
    aiUsageLog: {
      create: jest.fn().mockResolvedValue({}),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('GEMINI'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiEngine,
        { provide: GeminiProvider, useValue: mockProvider },
        { provide: OpenAiProvider, useValue: mockProvider },
        { provide: AnthropicProvider, useValue: mockProvider },
        { provide: LocalLlmProvider, useValue: mockProvider },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    engine = module.get<AiEngine>(AiEngine);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(engine).toBeDefined();
  });

  describe('generate', () => {
    it('should query active provider and log usage metrics', async () => {
      const res = await engine.generate('user-1', 'SUMMARY', 'Hello');
      expect(res).toBe('Mocked output');
      expect(mockProvider.generateText).toHaveBeenCalled();
      expect(mockRedisService.set).toHaveBeenCalled();
      expect(mockPrismaService.aiUsageLog.create).toHaveBeenCalled();
    });

    it('should serve response directly from cache if present', async () => {
      mockRedisService.get.mockResolvedValue('Cached Response text');
      const res = await engine.generate('user-1', 'SUMMARY', 'Hello');
      expect(res).toBe('Cached Response text');
      expect(mockProvider.generateText).not.toHaveBeenCalled();
    });
  });
});
