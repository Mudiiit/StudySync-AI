import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

@Processor('notification-queue')
export class NotificationWorker extends WorkerHost {
  private readonly logger = new Logger(NotificationWorker.name);

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === 'send-email') {
      const { to, subject, body } = job.data;
      this.logger.log(
        `[BullMQ Mail Worker] Processing email dispatch to: ${to}`,
      );
      this.logger.log(`Subject: ${subject}`);

      // Simulate dispatch latency
      await new Promise((resolve) => setTimeout(resolve, 300));

      this.logger.log(
        `[BullMQ Mail Worker] Email successfully dispatched to: ${to}`,
      );
      return { sent: true, to };
    }
  }
}
