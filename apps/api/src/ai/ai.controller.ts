import {
  Controller,
  Get,
  Post,
  Body,
  Sse,
  Query,
  UseGuards,
  MessageEvent,
  BadRequestException,
} from '@nestjs/common';
import { AiEngine } from './ai.engine';
import { PromptService } from './prompt.service';
import { StudyPlannerService } from './services/study-planner.service';
import { NotesIntelService } from './services/notes-intel.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { XpEngineService } from '../auth/xp-engine.service';

@Controller('ai')
export class AiController {
  constructor(
    private aiEngine: AiEngine,
    private promptService: PromptService,
    private studyPlanner: StudyPlannerService,
    private notesIntel: NotesIntelService,
    private prisma: PrismaService,
    private xpEngine: XpEngineService,
    @InjectQueue('ai-queue') private aiQueue: Queue,
  ) {}

  // ==========================================
  // STREAM TUTOR SESSIONS (SSE)
  // ==========================================

  @Sse('tutor/stream')
  streamTutor(
    @Query('prompt') prompt: string,
    @Query('system') system?: string,
  ): Observable<MessageEvent> {
    if (!prompt) {
      throw new BadRequestException(
        'Query parameter "prompt" is required for streaming',
      );
    }
    return this.aiEngine.stream(prompt, system).pipe(map((data) => ({ data })));
  }

  // ==========================================
  // SYNC GENERATIONS
  // ==========================================

  @Post('study-plan')
  @UseGuards(JwtAuthGuard)
  async generateStudyPlan(
    @CurrentUser() user: any,
    @Body('subject') subject: string,
    @Body('objectives') objectives: string,
    @Body('focus') focus: string,
  ) {
    return {
      plan: await this.studyPlanner.generateRoadmap(
        user.id,
        subject,
        objectives,
        focus,
      ),
    };
  }

  @Post('notes/summarize')
  @UseGuards(JwtAuthGuard)
  async summarizeNote(
    @CurrentUser() user: any,
    @Body('content') content: string,
    @Body('tone') tone?: string,
  ) {
    const summary = await this.notesIntel.summarizeNote(user.id, content, tone);
    this.xpEngine
      .grantXp(user.id, 'AI_SUMMARY_GENERATED', 'Generated AI Note Summary')
      .catch(console.error);
    return {
      summary,
    };
  }

  // ==========================================
  // ASYNC QUEUE EXECUTION
  // ==========================================

  @Post('queue/flashcards')
  @UseGuards(JwtAuthGuard)
  async queueFlashcards(
    @CurrentUser() user: any,
    @Body('topic') topic: string,
    @Body('deckId') deckId: string,
  ) {
    const job = await this.aiQueue.add('generate-flashcards-job', {
      userId: user.id,
      topic,
      deckId,
    });
    return { jobId: job.id, status: 'queued' };
  }

  @Post('queue/quiz')
  @UseGuards(JwtAuthGuard)
  async queueQuiz(
    @CurrentUser() user: any,
    @Body('topic') topic: string,
    @Body('quizId') quizId: string,
  ) {
    const job = await this.aiQueue.add('generate-quiz-job', {
      userId: user.id,
      topic,
      quizId,
    });
    return { jobId: job.id, status: 'queued' };
  }

  // ==========================================
  // PROMPT LIBRARY MANAGEMENT & TESTING
  // ==========================================

  @Post('prompt/test')
  @UseGuards(JwtAuthGuard)
  async testPrompt(
    @Body('key') key: string,
    @Body('variables') variables: Record<string, string>,
  ) {
    const rendered = await this.promptService.getRenderedPrompt(key, variables);
    return { key, rendered };
  }

  @Post('prompt/update')
  @UseGuards(JwtAuthGuard)
  async updatePrompt(
    @Body('key') key: string,
    @Body('template') template: string,
  ) {
    return this.promptService.updateTemplate(key, template);
  }

  // ==========================================
  // TOKEN USAGE ANALYTICS
  // ==========================================

  @Get('analytics/usage')
  @UseGuards(JwtAuthGuard)
  async getUsageAnalytics(@CurrentUser() user: any) {
    const logs = await this.prisma.aiUsageLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const summary = await this.prisma.aiUsageLog.aggregate({
      where: { userId: user.id },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        costEst: true,
      },
      _avg: {
        latencyMs: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      summary: {
        totalRequests: summary._count.id || 0,
        totalInputTokens: summary._sum.inputTokens || 0,
        totalOutputTokens: summary._sum.outputTokens || 0,
        totalCostEst: summary._sum.costEst || 0.0,
        averageLatencyMs: summary._avg.latencyMs || 0,
      },
      recentLogs: logs,
    };
  }
}
