import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PlannerAiService } from './planner-ai.service';
import { SchedulerService } from './scheduler.service';
import { GenerateDailyPlanDto } from '../dto/generate-daily-plan.dto';
import { GenerateSemesterPlanDto } from '../dto/generate-semester-plan.dto';

@Injectable()
export class PlannerGeneratorService {
  private readonly logger = new Logger(PlannerGeneratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly plannerAi: PlannerAiService,
    private readonly scheduler: SchedulerService,
  ) {}

  async generateDailyPlanAndSave(userId: string, dto: GenerateDailyPlanDto) {
    const rawBlocks = await this.plannerAi.generateDailyPlan(
      userId,
      dto.availableHours ?? 4,
      dto.energyLevel ?? 'MEDIUM',
    );

    const targetDate = dto.date ? new Date(dto.date) : new Date();
    const scheduledBlocks = await this.scheduler.allocateTimeSlots(
      userId,
      rawBlocks,
      targetDate,
    );

    const startDate = new Date(targetDate.setHours(0, 0, 0, 0));
    const endDate = new Date(targetDate.setHours(23, 59, 59, 999));

    // Save StudyPlan container
    const plan = await this.prisma.studyPlan.create({
      data: {
        userId,
        title: `AI Study Plan — ${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        type: 'DAILY',
        startDate,
        endDate,
        targetHours: dto.availableHours ?? 4,
      },
    });

    // Save individual StudySessions
    const savedSessions = [];
    for (const b of scheduledBlocks) {
      const session = await this.prisma.studySession.create({
        data: {
          planId: plan.id,
          userId,
          subject: b.subject,
          topic: b.topic,
          difficulty: b.difficulty || 'MEDIUM',
          priority: b.priority || 'MEDIUM',
          startTime: b.startTime ? new Date(b.startTime) : new Date(),
          endTime: b.endTime
            ? new Date(b.endTime)
            : new Date(Date.now() + b.durationMins * 60 * 1000),
          durationMins: b.durationMins,
          breakRecommend: b.breakRecommend,
          requiredDocIds: b.requiredDocIds || [],
          tutorMode: b.tutorMode || 'standard',
          masteryGain: b.masteryGain || 0.15,
        },
      });
      savedSessions.push(session);
    }

    return {
      plan,
      sessions: savedSessions,
    };
  }

  async generateSemesterRoadmapAndSave(
    userId: string,
    dto: GenerateSemesterPlanDto,
  ) {
    const mainSubject = dto.subjects[0] || dto.title;
    const steps = await this.plannerAi.generateRoadmap(
      userId,
      mainSubject,
      `Semester roadmap for ${dto.subjects.join(', ')}`,
      dto.weeksDuration,
    );

    const goal = await this.prisma.studyGoal.create({
      data: {
        userId,
        title: dto.title,
        subject: mainSubject,
        targetHours: steps.reduce((acc, s) => acc + s.estimatedHours, 0),
        targetDate: dto.examTargetDate
          ? new Date(dto.examTargetDate)
          : new Date(Date.now() + dto.weeksDuration * 7 * 24 * 60 * 60 * 1000),
      },
    });

    const savedMilestones = [];
    for (const s of steps) {
      const milestone = await this.prisma.studyMilestone.create({
        data: {
          goalId: goal.id,
          userId,
          title: s.title,
          weekNumber: s.weekNumber,
          order: s.weekNumber,
          estimatedHours: s.estimatedHours,
          topics: s.topics,
        },
      });
      savedMilestones.push(milestone);
    }

    return {
      goal,
      milestones: savedMilestones,
    };
  }

  async optimizeTodayWorkload(userId: string) {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const pendingSessions = await this.prisma.studySession.findMany({
      where: {
        userId,
        startTime: { gte: startOfDay },
        isCompleted: false,
      },
      orderBy: { priority: 'asc' },
    });

    if (pendingSessions.length === 0) {
      return {
        message: 'All scheduled sessions for today are already completed!',
      };
    }

    let currentStart = new Date(); // Start from current time
    currentStart.setMinutes(
      Math.ceil(currentStart.getMinutes() / 15) * 15,
      0,
      0,
    );

    const updated = [];
    for (const session of pendingSessions) {
      const newEnd = new Date(
        currentStart.getTime() + session.durationMins * 60 * 1000,
      );
      const res = await this.prisma.studySession.update({
        where: { id: session.id },
        data: {
          startTime: currentStart,
          endTime: newEnd,
        },
      });
      updated.push(res);
      currentStart = new Date(newEnd.getTime() + 15 * 60 * 1000); // 15m break interval
    }

    return {
      message: `Successfully optimized and rescheduled ${updated.length} study sessions.`,
      sessions: updated,
    };
  }
}
