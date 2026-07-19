import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SchedulingService } from './services/scheduling.service';
import { CalendarOptimizerService } from './services/calendar-optimizer.service';
import { AvailabilityService } from './services/availability.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(
    private prisma: PrismaService,
    private schedulingService: SchedulingService,
    private optimizerService: CalendarOptimizerService,
    private availabilityService: AvailabilityService,
  ) {}

  // ==========================================
  // EVENTS CRUD
  // ==========================================

  @Get('events')
  async getEvents(
    @CurrentUser() user: any,
    @Query('start') startStr: string,
    @Query('end') endStr: string,
  ) {
    if (!startStr || !endStr) {
      throw new BadRequestException(
        'Query parameters "start" and "end" are required',
      );
    }

    const start = new Date(startStr);
    const end = new Date(endStr);

    return this.prisma.calendarEvent.findMany({
      where: {
        calendar: { userId: user.id },
        startTime: { gte: start, lte: end },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  @Post('events')
  async createEvent(
    @CurrentUser() user: any,
    @Body('calendarId') calendarId: string,
    @Body('title') title: string,
    @Body('description') description: string,
    @Body('startTime') startStr: string,
    @Body('endTime') endStr: string,
  ) {
    const startTime = new Date(startStr);
    const endTime = new Date(endStr);

    // 1. Resolve Calendar ID
    let resolvedCalId = calendarId;
    if (!resolvedCalId) {
      let primaryCal = await this.prisma.calendar.findFirst({
        where: { userId: user.id, isPrimary: true },
      });
      if (!primaryCal) {
        primaryCal = await this.prisma.calendar.create({
          data: {
            userId: user.id,
            name: 'Primary Calendar',
            color: '#3B82F6',
            isPrimary: true,
          },
        });
      }
      resolvedCalId = primaryCal.id;
    }

    // 2. Conflict Warning Checks
    const conflicts = await this.schedulingService.detectConflicts(
      user.id,
      startTime,
      endTime,
    );

    const event = await this.prisma.calendarEvent.create({
      data: {
        calendarId: resolvedCalId,
        title,
        description,
        startTime,
        endTime,
      },
    });

    return {
      event,
      hasConflict: conflicts.length > 0,
      conflictingEvents: conflicts,
    };
  }

  @Patch('events/:id')
  async updateEvent(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      startTime?: string;
      endTime?: string;
    },
  ) {
    const updates: any = { ...body };
    if (body.startTime) updates.startTime = new Date(body.startTime);
    if (body.endTime) updates.endTime = new Date(body.endTime);

    // Verify ownership
    const event = await this.prisma.calendarEvent.findFirst({
      where: { id, calendar: { userId: user.id } },
    });
    if (!event) throw new BadRequestException('Event not found');

    const updated = await this.prisma.calendarEvent.update({
      where: { id },
      data: updates,
    });

    // Check conflicts on new range
    let conflicts: any[] = [];
    if (updates.startTime && updates.endTime) {
      conflicts = await this.schedulingService.detectConflicts(
        user.id,
        updates.startTime,
        updates.endTime,
        id,
      );
    }

    return {
      event: updated,
      hasConflict: conflicts.length > 0,
      conflictingEvents: conflicts,
    };
  }

  @Delete('events/:id')
  async deleteEvent(@CurrentUser() user: any, @Param('id') id: string) {
    const event = await this.prisma.calendarEvent.findFirst({
      where: { id, calendar: { userId: user.id } },
    });
    if (!event) throw new BadRequestException('Event not found');

    await this.prisma.calendarEvent.delete({ where: { id } });
    return { success: true };
  }

  // ==========================================
  // AI OPTIMIZATION & AUTO RESOLUTION
  // ==========================================

  @Post('optimize')
  async optimizeSchedule(
    @CurrentUser() user: any,
    @Body('date') dateStr: string,
  ) {
    if (!dateStr) throw new BadRequestException('Date parameter is required');
    const createdEvents = await this.optimizerService.optimizeSchedule(
      user.id,
      dateStr,
    );
    return { success: true, optimizedEvents: createdEvents };
  }

  @Post('resolve/:id')
  async autoResolveConflict(@CurrentUser() user: any, @Param('id') id: string) {
    const resolved = await this.schedulingService.autoResolveConflict(
      user.id,
      id,
    );
    return { success: true, event: resolved };
  }

  // ==========================================
  // AVAILABILITY PREFERENCES
  // ==========================================

  @Get('availability')
  async getAvailability(@CurrentUser() user: any) {
    return this.availabilityService.getSchedule(user.id);
  }

  @Patch('availability')
  async updateAvailability(@CurrentUser() user: any, @Body() body: any) {
    return this.availabilityService.updateSchedule(user.id, body);
  }
}
