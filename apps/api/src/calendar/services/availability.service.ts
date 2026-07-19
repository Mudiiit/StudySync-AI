import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async getSchedule(userId: string) {
    let schedule = await this.prisma.availabilitySchedule.findUnique({
      where: { userId },
    });

    if (!schedule) {
      // Default: 9am-5pm work, 6pm-9pm study, sleep 11pm-7am
      schedule = await this.prisma.availabilitySchedule.create({
        data: {
          userId,
          workingHours: [
            { day: 1, start: '09:00', end: '17:00' },
            { day: 2, start: '09:00', end: '17:00' },
            { day: 3, start: '09:00', end: '17:00' },
            { day: 4, start: '09:00', end: '17:00' },
            { day: 5, start: '09:00', end: '17:00' },
          ],
          studyHours: [
            { day: 1, start: '18:00', end: '21:00' },
            { day: 2, start: '18:00', end: '21:00' },
            { day: 3, start: '18:00', end: '21:00' },
            { day: 4, start: '18:00', end: '21:00' },
            { day: 5, start: '18:00', end: '21:00' },
          ],
          sleepStart: '23:00',
          sleepEnd: '07:00',
          timezone: 'UTC',
          excludeWeekends: false,
        },
      });
    }

    return schedule;
  }

  async updateSchedule(
    userId: string,
    data: {
      workingHours?: any;
      studyHours?: any;
      sleepStart?: string;
      sleepEnd?: string;
      timezone?: string;
      excludeWeekends?: boolean;
    },
  ) {
    // Check if availability exists
    await this.getSchedule(userId);

    return this.prisma.availabilitySchedule.update({
      where: { userId },
      data,
    });
  }
}
