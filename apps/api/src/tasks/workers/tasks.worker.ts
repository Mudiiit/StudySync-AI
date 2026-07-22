import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AutomationService } from '../services/automation.service';
import { PriorityService } from '../services/priority.service';

@Processor('tasks-queue')
@Injectable()
export class TasksWorker extends WorkerHost {
  private readonly logger = new Logger(TasksWorker.name);

  constructor(
    private readonly automationService: AutomationService,
    private readonly priorityService: PriorityService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(
      `[TasksWorker] Processing task job ${job.id} of type ${job.name}`,
    );

    switch (job.name) {
      case 'breakdown-task-bg':
        return this.automationService.autoBreakdownTask(
          job.data.userId,
          job.data.taskId,
        );

      case 'calculate-priorities-bg':
        return this.priorityService.runAiPrioritization(
          job.data.userId,
          job.data.workspaceId,
        );

      case 'overdue-monitor-bg':
        return this.automationService.handleOverdueTasks(
          job.data.userId,
          job.data.workspaceId,
        );

      default:
        this.logger.warn(`Unknown task job name: ${job.name}`);
        return null;
    }
  }
}
