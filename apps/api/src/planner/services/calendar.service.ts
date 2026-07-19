import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCalendarEventDto } from '../dto/create-calendar-event.dto';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOrCreatePrimaryCalendar(userId: string) {
    let primary = await this.prisma.calendar.findFirst({
      where: { userId, isPrimary: true },
    });
    if (!primary) {
      primary = await this.prisma.calendar.create({
        data: {
          userId,
          name: 'Primary Study Calendar',
          color: '#7c3aed',
          isPrimary: true,
        },
      });
    }
    return primary;
  }

  async getEvents(userId: string, start?: string, end?: string) {
    const calendar = await this.getOrCreatePrimaryCalendar(userId);

    const startDate = start
      ? new Date(start)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end
      ? new Date(end)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    return this.prisma.calendarEvent.findMany({
      where: {
        calendarId: calendar.id,
        startTime: { gte: startDate },
        endTime: { lte: endDate },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async createEvent(userId: string, dto: CreateCalendarEventDto) {
    const calendar = await this.getOrCreatePrimaryCalendar(userId);
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);

    // Conflict detection
    const overlapping = await this.prisma.calendarEvent.findMany({
      where: {
        calendarId: calendar.id,
        AND: [{ startTime: { lt: end } }, { endTime: { gt: start } }],
      },
    });

    const event = await this.prisma.calendarEvent.create({
      data: {
        calendarId: calendar.id,
        title: dto.title,
        description: dto.description,
        startTime: start,
        endTime: end,
        isAllDay: dto.isAllDay ?? false,
        location: dto.location,
      },
    });

    return {
      event,
      hasConflict: overlapping.length > 0,
      conflictingEvents: overlapping,
    };
  }

  async updateEvent(
    userId: string,
    eventId: string,
    updates: Partial<CreateCalendarEventDto>,
  ) {
    const calendar = await this.getOrCreatePrimaryCalendar(userId);
    const existing = await this.prisma.calendarEvent.findFirst({
      where: { id: eventId, calendarId: calendar.id },
    });

    if (!existing) {
      throw new NotFoundException('Calendar event not found');
    }

    return this.prisma.calendarEvent.update({
      where: { id: eventId },
      data: {
        title: updates.title ?? existing.title,
        description: updates.description ?? existing.description,
        startTime: updates.startTime
          ? new Date(updates.startTime)
          : existing.startTime,
        endTime: updates.endTime ? new Date(updates.endTime) : existing.endTime,
        isAllDay: updates.isAllDay ?? existing.isAllDay,
      },
    });
  }

  async deleteEvent(userId: string, eventId: string) {
    const calendar = await this.getOrCreatePrimaryCalendar(userId);
    const existing = await this.prisma.calendarEvent.findFirst({
      where: { id: eventId, calendarId: calendar.id },
    });
    if (!existing) throw new NotFoundException('Calendar event not found');

    return this.prisma.calendarEvent.delete({
      where: { id: eventId },
    });
  }

  async getCalendarIntelligence(userId: string) {
    const calendar = await this.getOrCreatePrimaryCalendar(userId);
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const upcomingEvents = await this.prisma.calendarEvent.findMany({
      where: {
        calendarId: calendar.id,
        startTime: { gte: now, lte: nextWeek },
      },
      orderBy: { startTime: 'asc' },
    });

    const alerts: { type: string; title: string; message: string }[] = [];

    if (upcomingEvents.length > 15) {
      alerts.push({
        type: 'OVERBOOKED',
        title: 'Overbooked Week Warning',
        message: `You have ${upcomingEvents.length} events scheduled in the next 7 days. Consider spacing out non-essential sessions.`,
      });
    }

    const lateNightEvents = upcomingEvents.filter(
      (e) => e.startTime.getHours() >= 22,
    );
    if (lateNightEvents.length > 0) {
      alerts.push({
        type: 'LATE_NIGHT',
        title: 'Late Night Overload',
        message: `${lateNightEvents.length} sessions are scheduled past 10 PM. Re-scheduling to daytime peak focus hours is recommended.`,
      });
    }

    return {
      upcomingCount: upcomingEvents.length,
      alerts,
    };
  }
}
