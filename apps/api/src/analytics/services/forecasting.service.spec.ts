import { Test, TestingModule } from '@nestjs/testing';
import { ForecastingService } from './forecasting.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ForecastingService', () => {
  let service: ForecastingService;

  const mockPrismaService = {
    task: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForecastingService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ForecastingService>(ForecastingService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getWorkloadForecast', () => {
    it('should calculate task due numbers and return busy level ranges', async () => {
      mockPrismaService.task.count
        .mockResolvedValueOnce(5) // upcoming tasks count
        .mockResolvedValueOnce(10) // completed tasks count
        .mockResolvedValueOnce(15); // total tasks count

      const res = await service.getWorkloadForecast('user-1');
      expect(res.upcomingTasksCount).toBe(5);
      expect(res.busyLevel).toBe('MEDIUM');
      expect(res.examReadinessScore).toBeGreaterThan(0);
    });
  });
});
