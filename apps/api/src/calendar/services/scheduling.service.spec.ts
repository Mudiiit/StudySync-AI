import { Test, TestingModule } from '@nestjs/testing';
import { SchedulingService } from './scheduling.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityService } from './availability.service';

describe('SchedulingService', () => {
  let service: SchedulingService;

  const mockPrismaService = {
    calendarEvent: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockAvailabilityService = {
    getSchedule: jest.fn().mockResolvedValue({
      studyHours: [
        { day: 1, start: '18:00', end: '20:00' }, // Monday 6-8pm
      ],
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AvailabilityService, useValue: mockAvailabilityService },
      ],
    }).compile();

    service = module.get<SchedulingService>(SchedulingService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('detectConflicts', () => {
    it('should query overlapping calendar events', async () => {
      mockPrismaService.calendarEvent.findMany.mockResolvedValue([
        { id: 'ev-1' },
      ]);

      const start = new Date('2026-07-02T10:00:00Z');
      const end = new Date('2026-07-02T11:00:00Z');

      const res = await service.detectConflicts('user-1', start, end);
      expect(res.length).toBe(1);
      expect(mockPrismaService.calendarEvent.findMany).toHaveBeenCalled();
    });
  });

  describe('findFreeSlots', () => {
    it('should return available study hours slots checking overlaps', async () => {
      mockPrismaService.calendarEvent.findMany.mockResolvedValue([]); // No events today

      const monday = new Date('2026-06-29T10:00:00Z'); // Monday
      const slots = await service.findFreeSlots('user-1', monday, 60);

      expect(slots.length).toBeGreaterThan(0);
      // Study hours start at 18:00 (6:00pm)
      expect(slots[0].getUTCHours()).toBe(18);
    });
  });
});
