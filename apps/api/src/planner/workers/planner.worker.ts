import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PlannerGeneratorService } from '../services/planner-generator.service';
import { AnalyticsService } from '../services/analytics.service';

@Processor('planner-queue')
@Injectable()
export class PlannerWorker extends WorkerHost {
  private readonly logger = new Logger(PlannerWorker.name);

  constructor(
    private readonly generator: PlannerGeneratorService,
    private readonly analytics: AnalyticsService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(
      `[PlannerWorker] Processing job ${job.id} of type ${job.name}`,
    );

    switch (job.name) {
      case 'generate-roadmap-bg':
        return this.generator.generateSemesterRoadmapAndSave(
          job.data.userId,
          job.data.dto,
        );

      case 'optimize-workload-bg':
        return this.generator.optimizeTodayWorkload(job.data.userId);

      case 'recalculate-analytics-bg':
        return this.analytics.getUserAnalytics(job.data.userId);

      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        return null;
    }
  }
}
