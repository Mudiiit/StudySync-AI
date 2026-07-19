import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerService } from './scheduler.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SchedulerService', () => {
  let service: SchedulerService;

  const mockPrisma = {
    studyConstraint: {
      findUnique: jest.fn().mockResolvedValue({
        preferredStartHour: 9,
        preferredEndHour: 21,
      }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulerService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SchedulerService>(SchedulerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should calculate spaced repetition interval for high performance score', () => {
    const res = service.calculateSpacedRepetitionInterval(1, 2.5, 90);
    expect(res.nextIntervalDays).toBe(3);
    expect(res.newEaseFactor).toBeGreaterThan(2.5);
  });

  it('should reset interval to 1 day for low performance score', () => {
    const res = service.calculateSpacedRepetitionInterval(5, 2.5, 45);
    expect(res.nextIntervalDays).toBe(1);
    expect(res.newEaseFactor).toBe(2.3);
  });
});
