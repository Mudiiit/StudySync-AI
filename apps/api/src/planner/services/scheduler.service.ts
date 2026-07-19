import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GeneratedStudyBlock } from '../interfaces/planner.interface';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async allocateTimeSlots(
    userId: string,
    blocks: GeneratedStudyBlock[],
    targetDate: Date = new Date(),
  ): Promise<GeneratedStudyBlock[]> {
    const constraint = await this.prisma.studyConstraint.findUnique({
      where: { userId },
    });

    const startHour = constraint?.preferredStartHour ?? 9;
    const endHour = constraint?.preferredEndHour ?? 21;

    let currentPointer = new Date(targetDate);
    currentPointer.setHours(startHour, 0, 0, 0);

    const scheduledBlocks: GeneratedStudyBlock[] = [];

    for (const block of blocks) {
      const blockStart = new Date(currentPointer);
      const blockEnd = new Date(
        currentPointer.getTime() + block.durationMins * 60 * 1000,
      );

      // Check if exceeding preferred end hour
      if (
        blockEnd.getHours() > endHour &&
        blockEnd.getDate() === targetDate.getDate()
      ) {
        this.logger.warn(
          `Schedule block ${block.subject} exceeds end hour bound. Truncating duration.`,
        );
      }

      scheduledBlocks.push({
        ...block,
        startTime: blockStart.toISOString(),
        endTime: blockEnd.toISOString(),
      });

      // Advance clock by session duration + 15 min break
      currentPointer = new Date(blockEnd.getTime() + 15 * 60 * 1000);
    }

    return scheduledBlocks;
  }

  calculateSpacedRepetitionInterval(
    currentInterval: number,
    currentEaseFactor: number,
    performanceScore: number, // 0 to 100
  ): { nextIntervalDays: number; newEaseFactor: number } {
    let newEaseFactor = currentEaseFactor;
    let nextIntervalDays = 1;

    if (performanceScore < 60) {
      // Weak score: reset interval to 1 day and lower ease factor
      newEaseFactor = Math.max(1.3, currentEaseFactor - 0.2);
      nextIntervalDays = 1;
    } else if (performanceScore < 85) {
      // Moderate score: slight increase
      nextIntervalDays = Math.max(2, Math.round(currentInterval * 1.5));
    } else {
      // High score: multiply by ease factor
      newEaseFactor = Math.min(3.0, currentEaseFactor + 0.1);
      if (currentInterval === 1) {
        nextIntervalDays = 3;
      } else {
        nextIntervalDays = Math.round(currentInterval * newEaseFactor);
      }
    }

    return { nextIntervalDays, newEaseFactor };
  }
}
