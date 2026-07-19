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
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CalendarService } from '../services/calendar.service';
import { CreateCalendarEventDto } from '../dto/create-calendar-event.dto';

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('events')
  async getEvents(
    @CurrentUser() user: any,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.calendarService.getEvents(user.id, start, end);
  }

  @Post('events')
  async createEvent(
    @CurrentUser() user: any,
    @Body() dto: CreateCalendarEventDto,
  ) {
    return this.calendarService.createEvent(user.id, dto);
  }

  @Patch('events/:id')
  async updateEvent(
    @CurrentUser() user: any,
    @Param('id') eventId: string,
    @Body() updates: Partial<CreateCalendarEventDto>,
  ) {
    return this.calendarService.updateEvent(user.id, eventId, updates);
  }

  @Delete('events/:id')
  async deleteEvent(@CurrentUser() user: any, @Param('id') eventId: string) {
    return this.calendarService.deleteEvent(user.id, eventId);
  }

  @Get('intelligence')
  async getCalendarIntelligence(@CurrentUser() user: any) {
    return this.calendarService.getCalendarIntelligence(user.id);
  }
}
