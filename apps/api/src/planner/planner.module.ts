import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { AiModule } from '../ai/ai.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { PlannerController } from './controllers/planner.controller';
import { CalendarController } from './controllers/calendar.controller';
import { PlannerService } from './services/planner.service';
import { PlannerAiService } from './services/planner-ai.service';
import { PlannerGeneratorService } from './services/planner-generator.service';
import { SchedulerService } from './services/scheduler.service';
import { RecommendationService } from './services/recommendation.service';
import { AnalyticsService } from './services/analytics.service';
import { CalendarService } from './services/calendar.service';
import { GoalService } from './services/goal.service';
import { PlannerWorker } from './workers/planner.worker';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AiModule,
    KnowledgeModule,
    BullModule.registerQueue({
      name: 'planner-queue',
    }),
  ],
  controllers: [PlannerController, CalendarController],
  providers: [
    PlannerService,
    PlannerAiService,
    PlannerGeneratorService,
    SchedulerService,
    RecommendationService,
    AnalyticsService,
    CalendarService,
    GoalService,
    PlannerWorker,
  ],
  exports: [
    PlannerService,
    PlannerGeneratorService,
    CalendarService,
    AnalyticsService,
  ],
})
export class PlannerModule {}
