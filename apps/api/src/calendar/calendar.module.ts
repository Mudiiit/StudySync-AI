import { Module } from '@nestjs/common';
import { CalendarController } from './calendar.controller';
import { SchedulingService } from './services/scheduling.service';
import { CalendarOptimizerService } from './services/calendar-optimizer.service';
import { AvailabilityService } from './services/availability.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CalendarController],
  providers: [SchedulingService, CalendarOptimizerService, AvailabilityService],
  exports: [SchedulingService, CalendarOptimizerService, AvailabilityService],
})
export class CalendarModule {}
