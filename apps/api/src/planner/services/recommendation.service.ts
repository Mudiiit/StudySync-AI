import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MemoryService } from '../../knowledge/services/memory.service';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly memoryService: MemoryService,
  ) {}

  async getRecommendations(userId: string) {
    const existing = await this.prisma.learningRecommendation.findMany({
      where: { userId, isDismissed: false },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    if (existing.length > 0) {
      return existing;
    }

    // Auto-generate fresh recommendations if none active
    await this.generateFreshRecommendations(userId);

    return this.prisma.learningRecommendation.findMany({
      where: { userId, isDismissed: false },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });
  }

  async generateFreshRecommendations(userId: string) {
    const memory = await this.memoryService.getOrCreateMemory(userId);
    const weakTopics = memory.weakTopics || [];

    const recommendationsToCreate: {
      userId: string;
      type: string;
      actionText: string;
      reasoning: string;
      subject?: string;
      topic?: string;
      priority: string;
    }[] = [];

    if (weakTopics.length > 0) {
      const topWeak = weakTopics[0];
      recommendationsToCreate.push({
        userId,
        type: 'REVISION',
        actionText: `Review ${topWeak} today`,
        reasoning: `Identified as a core weak topic in recent quiz attempts. Spaced repetition will boost retention.`,
        topic: topWeak,
        priority: 'HIGH',
      });
    }

    // Check overdue spaced repetitions
    const overdue = await this.prisma.revisionSchedule.findMany({
      where: {
        userId,
        nextRevisionDate: { lte: new Date() },
        status: 'PENDING',
      },
      take: 2,
    });

    for (const item of overdue) {
      recommendationsToCreate.push({
        userId,
        type: 'PRACTICE',
        actionText: `Revise ${item.topicName} tonight`,
        reasoning: `Scheduled spaced repetition review is due to prevent forgetting curve decay.`,
        subject: item.subject,
        topic: item.topicName,
        priority: 'MEDIUM',
      });
    }

    if (recommendationsToCreate.length === 0) {
      recommendationsToCreate.push({
        userId,
        type: 'OPTIMIZATION',
        actionText: 'Generate Semester Milestone Plan',
        reasoning:
          'Setting structured weekly targets keeps study velocity consistent over the term.',
        priority: 'LOW',
      });
    }

    for (const rec of recommendationsToCreate) {
      await this.prisma.learningRecommendation.create({ data: rec });
    }
  }

  async applyRecommendation(userId: string, recommendationId: string) {
    const rec = await this.prisma.learningRecommendation.findFirst({
      where: { id: recommendationId, userId },
    });
    if (!rec) return null;

    await this.prisma.learningRecommendation.update({
      where: { id: recommendationId },
      data: { isApplied: true, isDismissed: true },
    });

    return { success: true, applied: rec };
  }
}
