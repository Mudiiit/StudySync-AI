import { Test, TestingModule } from '@nestjs/testing';
import { FeatureFlagService } from './feature-flags.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;

  const mockPrismaService = {
    featureFlag: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureFlagService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<FeatureFlagService>(FeatureFlagService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isEnabled', () => {
    it('should return cached value if present in Redis', async () => {
      mockRedisService.get.mockResolvedValue('true');
      const res = await service.isEnabled('ai-tutor');
      expect(res).toBe(true);
      expect(mockRedisService.get).toHaveBeenCalledWith(
        'feature-flag:ai-tutor',
      );
    });

    it('should fallback to DB if cache is missing', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.featureFlag.findUnique.mockResolvedValue({
        key: 'ai-tutor',
        isEnabled: false,
      });

      const res = await service.isEnabled('ai-tutor');
      expect(res).toBe(false);
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'feature-flag:ai-tutor',
        'false',
        3600,
      );
    });
  });
});
