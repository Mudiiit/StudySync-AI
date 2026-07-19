import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import * as express from 'express';
import { AnalyticsAggregationService } from './services/analytics-aggregation.service';
import { ForecastingService } from './services/forecasting.service';
import { PersonalizationService } from './services/personalization.service';
import { AiInsightsService } from './services/ai-insights.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(
    private aggregationService: AnalyticsAggregationService,
    private forecastingService: ForecastingService,
    private personalizationService: PersonalizationService,
    private insightsService: AiInsightsService,
  ) {}

  @Get('dashboard')
  async getDashboardData(
    @CurrentUser() user: any,
    @Query('days') daysStr?: string,
  ) {
    const days = daysStr ? parseInt(daysStr, 10) : 7;
    const history = await this.aggregationService.getHistoricalMetrics(
      user.id,
      days,
    );
    return {
      history,
      totalStudyMinutes: history.reduce(
        (acc, cur) => acc + cur.studyMinutes,
        0,
      ),
      totalCompletedTasks: history.reduce(
        (acc, cur) => acc + cur.completedTasks,
        0,
      ),
      averageQuizScore:
        history.length > 0
          ? history.reduce((acc, cur) => acc + cur.quizScoresAvg, 0) /
            history.length
          : 85,
    };
  }

  @Get('forecast')
  async getForecast(@CurrentUser() user: any) {
    return this.forecastingService.getWorkloadForecast(user.id);
  }

  @Get('recommendations')
  async getRecommendations(@CurrentUser() user: any) {
    return this.personalizationService.getRecommendations(user.id);
  }

  @Get('insights')
  async getAiInsights(@CurrentUser() user: any) {
    const review = await this.insightsService.generateAiReview(user.id);
    return { review };
  }

  @Get('export')
  async exportReport(@CurrentUser() user: any, @Res() res: express.Response) {
    const history = await this.aggregationService.getHistoricalMetrics(
      user.id,
      30,
    );

    let csv = 'Date,Study Minutes,Completed Tasks,Quiz Average\n';
    for (const h of history) {
      const dateStr = h.date.toISOString().split('T')[0];
      csv += `${dateStr},${h.studyMinutes},${h.completedTasks},${h.quizScoresAvg}\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=StudySync_Report_${user.id}.csv`,
    );
    return res.status(200).send(csv);
  }
}
