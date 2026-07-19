import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiEngine } from '../../ai/ai.engine';
import { AvailabilityService } from './availability.service';
import { TaskStatus } from '@prisma/client';

@Injectable()
export class CalendarOptimizerService {
  private readonly logger = new Logger(CalendarOptimizerService.name);

  constructor(
    private prisma: PrismaService,
    private aiEngine: AiEngine,
    private availabilityService: AvailabilityService,
  ) {}

  private async getOrCreatePrimaryCalendar(userId: string) {
    let cal = await this.prisma.calendar.findFirst({
      where: { userId, isPrimary: true },
    });
    if (!cal) {
      cal = await this.prisma.calendar.create({
        data: {
          userId,
          name: 'Primary Calendar',
          color: '#3B82F6',
          isPrimary: true,
        },
      });
    }
    return cal;
  }

  async optimizeSchedule(userId: string, targetDayStr: string): Promise<any[]> {
    const calendar = await this.getOrCreatePrimaryCalendar(userId);
    const schedule = await this.availabilityService.getSchedule(userId);

    // 1. Load pending tasks
    const tasks = await this.prisma.task.findMany({
      where: { userId, status: { not: TaskStatus.DONE }, inTrash: false },
      take: 10,
    });

    // 2. Load existing calendar events for the day
    const date = new Date(targetDayStr);
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const existingEvents = await this.prisma.calendarEvent.findMany({
      where: {
        calendarId: calendar.id,
        startTime: { lt: endOfDay },
        endTime: { gt: startOfDay },
      },
    });

    // 3. Construct prompt
    const tasksPromptStr = tasks
      .map(
        (t) =>
          `- Title: "${t.title}", Priority: ${t.priority}, Due: ${t.dueDate?.toISOString() || 'N/A'}`,
      )
      .join('\n');
    const existingEventsPromptStr = existingEvents
      .map(
        (e) =>
          `- "${e.title}" from ${e.startTime.toISOString()} to ${e.endTime.toISOString()}`,
      )
      .join('\n');

    const prompt =
      `Optimize my study calendar for the day ${targetDayStr}.\n` +
      `Here is my availability configuration:\n` +
      `- Working Hours: ${JSON.stringify(schedule.workingHours)}\n` +
      `- Preferred Study Hours: ${JSON.stringify(schedule.studyHours)}\n` +
      `- Sleep: ${schedule.sleepStart} to ${schedule.sleepEnd}\n\n` +
      `Here are my pending tasks that need scheduling:\n${tasksPromptStr || 'None'}\n\n` +
      `Here are my existing scheduled events to avoid overlaps:\n${existingEventsPromptStr || 'None'}\n\n` +
      `Suggest a list of study session events. Return ONLY a valid JSON array of objects with the exact properties: ` +
      `[{"title": "Study Calculus", "startTime": "YYYY-MM-DDTHH:MM:SSZ", "endTime": "YYYY-MM-DDTHH:MM:SSZ", "description": "Brief description"}]. ` +
      `Align start/end times with preferred study hours and avoid conflicts. Do not include markdown backticks.`;

    try {
      const result = await this.aiEngine.generate(
        userId,
        'CALENDAR_OPTIMIZATION',
        prompt,
        'You are an expert AI scheduler helping students balance workloads.',
        { responseMimeType: 'application/json' },
      );

      const cleaned = result
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      const suggestions = JSON.parse(cleaned);

      const createdEvents: any[] = [];
      if (Array.isArray(suggestions)) {
        for (const sugg of suggestions) {
          const event = await this.prisma.calendarEvent.create({
            data: {
              calendarId: calendar.id,
              title: sugg.title,
              description: sugg.description || 'AI Recommended Study Session',
              startTime: new Date(sugg.startTime),
              endTime: new Date(sugg.endTime),
            },
          });
          createdEvents.push(event);
        }
      }

      return createdEvents;
    } catch (e: any) {
      this.logger.error(`AI Schedule Optimization failure: ${e.message}`);
      return [];
    }
  }
}
