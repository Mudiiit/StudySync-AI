import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface UserMemoryProfile {
  weakTopics: string[];
  strongTopics: string[];
  learningStyle: string;
  preferredExplanation: string;
  goals: string[];
  recentUploadsCount: number;
}

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(private prisma: PrismaService) {}

  async getOrCreateMemory(userId: string): Promise<any> {
    let memory = await this.prisma.userMemory.findUnique({
      where: { userId },
    });

    if (!memory) {
      memory = await this.prisma.userMemory.create({
        data: {
          userId,
          weakTopics: [],
          strongTopics: [],
          learningStyle: 'standard',
          preferredExplanation: 'standard',
          goals: [],
        },
      });
    }

    return memory;
  }

  async updateMemoryProfile(
    userId: string,
    data: {
      learningStyle?: string;
      preferredExplanation?: string;
      goals?: string[];
      weakTopics?: string[];
      strongTopics?: string[];
    },
  ) {
    const memory = await this.getOrCreateMemory(userId);
    return this.prisma.userMemory.update({
      where: { id: memory.id },
      data,
    });
  }

  async learnFromQuizAttempt(userId: string, attemptId: string) {
    try {
      const attempt = await this.prisma.attempt.findUnique({
        where: { id: attemptId },
        include: {
          quiz: {
            select: { title: true },
          },
        },
      });

      if (!attempt) return;

      const scorePercent = attempt.percentage;
      const topic = attempt.quiz.title.trim();

      const memory = await this.getOrCreateMemory(userId);

      let weakTopics = [...memory.weakTopics];
      let strongTopics = [...memory.strongTopics];

      if (scorePercent < 60) {
        if (!weakTopics.includes(topic)) {
          weakTopics.push(topic);
        }
        strongTopics = strongTopics.filter((t) => t !== topic);
      } else if (scorePercent >= 85) {
        if (!strongTopics.includes(topic)) {
          strongTopics.push(topic);
        }
        weakTopics = weakTopics.filter((t) => t !== topic);
      }

      await this.prisma.userMemory.update({
        where: { id: memory.id },
        data: {
          weakTopics,
          strongTopics,
        },
      });

      this.logger.log(
        `[MemoryService] Quiz attempt analyzed. Updated memory profile for user ${userId}`,
      );
    } catch (e: any) {
      this.logger.error(
        `[MemoryService] Failed learning from quiz attempt: ${e.message}`,
      );
    }
  }

  async compileMemoryContext(userId: string): Promise<string> {
    const memory = await this.getOrCreateMemory(userId);
    const recentUploads = await this.prisma.document.findMany({
      where: { userId },
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: { name: true },
    });

    const recentDocs = recentUploads.map((d) => d.name).join(', ');

    return `STUDENT LEARNING STYLE PROFILE:
- Preferred Explanation Level: ${memory.preferredExplanation}
- Cognitive Learning Style: ${memory.learningStyle}
- Strong Areas/Topics: ${memory.strongTopics.join(', ') || 'None identified yet'}
- Weak Areas/Topics (Needs Reinforcement): ${memory.weakTopics.join(', ') || 'None identified yet'}
- Learning Goals: ${memory.goals.join(', ') || 'Not specified'}
- Recently Indexed Materials: ${recentDocs || 'No uploads'}`;
  }
}
