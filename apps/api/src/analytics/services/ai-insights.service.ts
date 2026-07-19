import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsAggregationService } from './analytics-aggregation.service';
import { AiEngine } from '../../ai/ai.engine';

@Injectable()
export class AiInsightsService {
  private readonly logger = new Logger(AiInsightsService.name);

  constructor(
    private aggregationService: AnalyticsAggregationService,
    private aiEngine: AiEngine,
  ) {}

  async generateAiReview(userId: string): Promise<string> {
    const metrics = await this.aggregationService.getHistoricalMetrics(
      userId,
      7,
    );

    const totalMinutes = metrics.reduce(
      (acc, cur) => acc + cur.studyMinutes,
      0,
    );
    const totalTasks = metrics.reduce(
      (acc, cur) => acc + cur.completedTasks,
      0,
    );

    const prompt =
      `Formulate a quick learning report based on my study metrics from the past week:\n` +
      `- Total study time: ${totalMinutes} minutes\n` +
      `- Completed tasks: ${totalTasks} items\n` +
      `- Quiz Average: 85%\n\n` +
      `Provide a brief, 3-sentence actionable review. Keep it encouraging and outline 1 improvement tip.`;

    try {
      const result = await this.aiEngine.generate(
        userId,
        'STUDY_ANALYTICS',
        prompt,
        'You are an expert AI academic advisor helping students optimize study habits.',
      );
      return result;
    } catch (e: any) {
      this.logger.warn(`AI Review compilation failure: ${e.message}`);
      return `Weekly Report Summary: You have logged ${totalMinutes} minutes of focused study time and completed ${totalTasks} tasks this week! Keep maintaining this streak. Tip: Revise high-priority items on weekends.`;
    }
  }
}
