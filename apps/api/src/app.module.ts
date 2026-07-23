import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AiModule } from './ai/ai.module';
import { NotesModule } from './notes/notes.module';
import { TasksModule } from './tasks/tasks.module';
import { RedisModule } from './redis/redis.module';
import { ObservabilityModule } from './observability/observability.module';
import { StorageModule } from './storage/storage.module';
import { QueuesModule } from './queues/queues.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SearchModule } from './search/search.module';
import { FeatureFlagsModule } from './feature-flags/feature-flags.module';
import { RagModule } from './rag/rag.module';
import { CalendarModule } from './calendar/calendar.module';
import { CollaborationModule } from './collaboration/collaboration.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { FlashcardsModule } from './flashcards/flashcards.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { TutorModule } from './tutor/tutor.module';
import { SocialModule } from './social/social.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { PlannerModule } from './planner/planner.module';

import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    AiModule,
    NotesModule,
    TasksModule,
    RedisModule,
    ObservabilityModule,
    StorageModule,
    QueuesModule,
    NotificationsModule,
    SearchModule,
    FeatureFlagsModule,
    RagModule,
    CalendarModule,
    CollaborationModule,
    AnalyticsModule,
    FlashcardsModule,
    QuizzesModule,
    TutorModule,
    SocialModule,
    KnowledgeModule,
    PlannerModule,
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

