import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsAggregationService } from './services/analytics-aggregation.service';
import { ForecastingService } from './services/forecasting.service';
import { PersonalizationService } from './services/personalization.service';
import { AiInsightsService } from './services/ai-insights.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsAggregationService,
    ForecastingService,
    PersonalizationService,
    AiInsightsService,
  ],
  exports: [
    AnalyticsAggregationService,
    ForecastingService,
    PersonalizationService,
    AiInsightsService,
  ],
})
export class AnalyticsModule {}
