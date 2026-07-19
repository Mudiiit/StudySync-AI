import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityService } from './availability.service';

@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);

  constructor(
    private prisma: PrismaService,
    private availabilityService: AvailabilityService,
  ) {}

  // ==========================================
  // CONFLICT DETECTION
  // ==========================================

  async detectConflicts(
    userId: string,
    startTime: Date,
    endTime: Date,
    ignoreEventId?: string,
  ): Promise<any[]> {
    return this.prisma.calendarEvent.findMany({
      where: {
        calendar: { userId },
        id: ignoreEventId ? { not: ignoreEventId } : undefined,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });
  }

  // ==========================================
  // TIME SLOTS ALLOCATOR
  // ==========================================

  async findFreeSlots(
    userId: string,
    targetDay: Date,
    durationMinutes: number,
  ): Promise<Date[]> {
    const schedule = await this.availabilityService.getSchedule(userId);

    // 1. Resolve date range boundary
    const startOfDay = new Date(targetDay);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDay);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // 2. Fetch existing blocking events
    const blockingEvents = await this.prisma.calendarEvent.findMany({
      where: {
        calendar: { userId },
        startTime: { lt: endOfDay },
        endTime: { gt: startOfDay },
      },
    });

    // 3. Scan preferred study hours slots
    const dayOfWeek = startOfDay.getUTCDay();
    const studyHoursList = (schedule.studyHours as any[]) || [];
    const todayStudy = studyHoursList.find((x) => x.day === dayOfWeek);

    if (!todayStudy) {
      return []; // No study slots configured for today
    }

    const [studyStartH, studyStartM] = todayStudy.start.split(':').map(Number);
    const [studyEndH, studyEndM] = todayStudy.end.split(':').map(Number);

    const studyStart = new Date(startOfDay);
    studyStart.setUTCHours(studyStartH, studyStartM, 0, 0);
    const studyEnd = new Date(startOfDay);
    studyEnd.setUTCHours(studyEndH, studyEndM, 0, 0);

    const freeSlots: Date[] = [];
    const intervalMinutes = 30; // Scan slots every 30 minutes
    const candidate = new Date(studyStart);

    while (
      candidate.getTime() + durationMinutes * 60 * 1000 <=
      studyEnd.getTime()
    ) {
      const candidateEnd = new Date(
        candidate.getTime() + durationMinutes * 60 * 1000,
      );

      // Check collision against blocking events
      const hasCollision = blockingEvents.some(
        (event) => event.startTime < candidateEnd && event.endTime > candidate,
      );

      if (!hasCollision) {
        freeSlots.push(new Date(candidate));
      }

      candidate.setUTCMinutes(candidate.getUTCMinutes() + intervalMinutes);
    }

    return freeSlots;
  }

  // ==========================================
  // AUTO RESOLVE CONFLICTS
  // ==========================================

  async autoResolveConflict(userId: string, eventId: string): Promise<any> {
    const event = await this.prisma.calendarEvent.findFirst({
      where: { id: eventId, calendar: { userId } },
    });
    if (!event) throw new Error('Event not found');

    const duration =
      (event.endTime.getTime() - event.startTime.getTime()) / (60 * 1000);

    // Look for available slots starting from today up to 3 days out
    for (let offset = 0; offset < 3; offset++) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + offset);

      const slots = await this.findFreeSlots(userId, targetDate, duration);
      if (slots.length > 0) {
        const selectedSlot = slots[0];
        const newEnd = new Date(selectedSlot.getTime() + duration * 60 * 1000);

        this.logger.log(
          `Shifting event ${eventId} to resolved time slot: ${selectedSlot.toISOString()}`,
        );
        return this.prisma.calendarEvent.update({
          where: { id: eventId },
          data: {
            startTime: selectedSlot,
            endTime: newEnd,
          },
        });
      }
    }

    throw new Error(
      'Could not resolve conflict: no free time slots found in availability window',
    );
  }
}
