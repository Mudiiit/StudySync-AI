import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { PlannerService } from '../services/planner.service';
import { PlannerGeneratorService } from '../services/planner-generator.service';
import { PlannerAiService } from '../services/planner-ai.service';
import { RecommendationService } from '../services/recommendation.service';
import { AnalyticsService } from '../services/analytics.service';
import { GenerateDailyPlanDto } from '../dto/generate-daily-plan.dto';
import { GenerateSemesterPlanDto } from '../dto/generate-semester-plan.dto';
import { GenerateRoadmapDto } from '../dto/generate-roadmap.dto';

@Controller('planner')
@UseGuards(JwtAuthGuard)
export class PlannerController {
  constructor(
    private readonly plannerService: PlannerService,
    private readonly generatorService: PlannerGeneratorService,
    private readonly plannerAiService: PlannerAiService,
    private readonly recommendationService: RecommendationService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Get('today')
  async getTodayPlan(@CurrentUser() user: any) {
    return this.plannerService.getTodayPlan(user.id);
  }

  @Post('daily/generate')
  async generateDailyPlan(
    @CurrentUser() user: any,
    @Body() dto: GenerateDailyPlanDto,
  ) {
    return this.generatorService.generateDailyPlanAndSave(user.id, dto);
  }

  @Post('optimize-today')
  async optimizeTodayWorkload(@CurrentUser() user: any) {
    return this.generatorService.optimizeTodayWorkload(user.id);
  }

  @Post('semester/generate')
  async generateSemesterPlan(
    @CurrentUser() user: any,
    @Body() dto: GenerateSemesterPlanDto,
  ) {
    return this.generatorService.generateSemesterRoadmapAndSave(user.id, dto);
  }

  @Post('roadmap/generate')
  async generateRoadmap(
    @CurrentUser() user: any,
    @Body() dto: GenerateRoadmapDto,
  ) {
    return this.plannerAiService.generateRoadmap(
      user.id,
      dto.subject,
      dto.objectives,
      dto.weeksDuration ?? 4,
    );
  }

  @Patch('sessions/:id/complete')
  async completeSession(
    @CurrentUser() user: any,
    @Param('id') sessionId: string,
  ) {
    return this.plannerService.completeSession(user.id, sessionId);
  }

  @Get('recommendations')
  async getRecommendations(@CurrentUser() user: any) {
    return this.recommendationService.getRecommendations(user.id);
  }

  @Post('recommendations/:id/apply')
  async applyRecommendation(
    @CurrentUser() user: any,
    @Param('id') recommendationId: string,
  ) {
    return this.recommendationService.applyRecommendation(
      user.id,
      recommendationId,
    );
  }

  @Get('analytics')
  async getAnalytics(@CurrentUser() user: any) {
    return this.analyticsService.getUserAnalytics(user.id);
  }
}
