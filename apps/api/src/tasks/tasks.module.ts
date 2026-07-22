import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { AiModule } from '../ai/ai.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { AuthModule } from '../auth/auth.module';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { PomodoroController } from './pomodoro.controller';
import { GoalsController } from './goals.controller';
import { TasksRepository } from './repositories/tasks.repository';

// Services
import { WorkspaceService } from './services/workspace.service';
import { BoardService } from './services/board.service';
import { DependencyService } from './services/dependency.service';
import { AutomationService } from './services/automation.service';
import { EstimationService } from './services/estimation.service';
import { PriorityService } from './services/priority.service';
import { AnalyticsService } from './services/analytics.service';

// Workers
import { TasksWorker } from './workers/tasks.worker';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AiModule,
    KnowledgeModule,
    AuthModule,
    BullModule.registerQueue({
      name: 'tasks-queue',
    }),
  ],
  controllers: [TasksController, PomodoroController, GoalsController],
  providers: [
    TasksService,
    TasksRepository,
    WorkspaceService,
    BoardService,
    DependencyService,
    AutomationService,
    EstimationService,
    PriorityService,
    AnalyticsService,
    TasksWorker,
  ],
  exports: [
    TasksService,
    TasksRepository,
    WorkspaceService,
    BoardService,
    DependencyService,
    AutomationService,
    EstimationService,
    PriorityService,
    AnalyticsService,
  ],
})
export class TasksModule {}
