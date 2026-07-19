import { Injectable, Logger } from '@nestjs/common';
import { AiEngine } from '../../ai/ai.engine';
import { PrismaService } from '../../prisma/prisma.service';
import { MemoryService } from '../../knowledge/services/memory.service';
import {
  GeneratedStudyBlock,
  GeneratedRoadmapStep,
} from '../interfaces/planner.interface';

@Injectable()
export class PlannerAiService {
  private readonly logger = new Logger(PlannerAiService.name);

  constructor(
    private readonly aiEngine: AiEngine,
    private readonly prisma: PrismaService,
    private readonly memoryService: MemoryService,
  ) {}

  async generateDailyPlan(
    userId: string,
    availableHours = 4,
    energyLevel = 'MEDIUM',
  ): Promise<GeneratedStudyBlock[]> {
    try {
      const memory = await this.memoryService.getOrCreateMemory(userId);
      const weakTopics = memory.weakTopics || [];
      const strongTopics = memory.strongTopics || [];

      // Fetch user documents
      const userDocs = await this.prisma.document.findMany({
        where: { userId },
        select: { id: true, name: true, tags: true },
        take: 10,
      });

      // Fetch recent low quiz scores using Attempt model
      const recentAttempts = await this.prisma.attempt.findMany({
        where: { userId },
        orderBy: { startedAt: 'desc' },
        take: 5,
        include: { quiz: true },
      });

      const lowQuizSubjects = recentAttempts
        .filter((a: any) => a.percentage < 65)
        .map((a: any) => a.quiz?.title || 'Quiz Subject');

      const docSummary = userDocs
        .map((d) => `[ID: ${d.id}] ${d.name}`)
        .join(', ');

      const prompt = `Generate an optimal daily study schedule for a student.
Student Context:
- Available Daily Study Hours: ${availableHours} hours
- Energy Level: ${energyLevel}
- Weak Topics Needing Revision: ${weakTopics.join(', ') || 'None'}
- Strong Mastered Topics: ${strongTopics.join(', ') || 'None'}
- Low Quiz Performance Areas: ${lowQuizSubjects.join(', ') || 'None'}
- Available Study Documents: ${docSummary || 'None'}

Rules:
1. Divide into 2-5 study blocks.
2. Return JSON ONLY as a valid JSON array of objects with keys: subject, topic, difficulty, priority, durationMins, breakRecommend, tutorMode, masteryGain.`;

      const jsonText = await this.aiEngine.generate(
        userId,
        'PLANNER_DAILY',
        prompt,
        'You output pure JSON arrays for study blocks.',
      );

      let blocks: GeneratedStudyBlock[] = [];
      const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        blocks = JSON.parse(jsonMatch[0]);
      } else {
        blocks = JSON.parse(jsonText);
      }

      if (Array.isArray(blocks) && blocks.length > 0) {
        return blocks;
      }
    } catch (e: any) {
      this.logger.warn(`AI Plan Generation fallback used: ${e.message}`);
    }

    return [
      {
        subject: 'Core Computer Science',
        topic: 'Data Structures & Algorithmic Complexity',
        difficulty: 'HARD',
        priority: 'HIGH',
        durationMins: 90,
        breakRecommend: 'Take 15m break after 75m',
        tutorMode: 'socratic',
        masteryGain: 0.2,
      },
      {
        subject: 'System Architecture',
        topic: 'Operating Systems & Memory Hierarchy',
        difficulty: 'MEDIUM',
        priority: 'MEDIUM',
        durationMins: 60,
        breakRecommend: 'Take 10m break after 50m',
        tutorMode: 'standard',
        masteryGain: 0.15,
      },
    ];
  }

  async generateRoadmap(
    userId: string,
    subject: string,
    objectives?: string,
    weeksDuration = 4,
  ): Promise<GeneratedRoadmapStep[]> {
    try {
      const memory = await this.memoryService.getOrCreateMemory(userId);

      const prompt = `Create a comprehensive ${weeksDuration}-week learning roadmap for subject: "${subject}".
Student Learning Style: ${memory.learningStyle}
User Objectives: ${objectives || 'Master core concepts and prepare for exams'}

Return JSON ONLY as an array of week steps with keys: title, description, weekNumber, estimatedHours, topics.`;

      const jsonText = await this.aiEngine.generate(
        userId,
        'PLANNER_ROADMAP',
        prompt,
        'You output pure JSON arrays for learning roadmaps.',
      );

      const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e: any) {
      this.logger.warn(`AI Roadmap fallback triggered: ${e.message}`);
    }

    return [
      {
        title: `Week 1: ${subject} Foundations`,
        description: 'Core concepts and basic problem solving.',
        weekNumber: 1,
        estimatedHours: 6,
        topics: ['Basic Principles', 'Key Definitions', 'Initial Examples'],
      },
      {
        title: `Week 2: Intermediate ${subject}`,
        description: 'Deep dive into analytical structures and practice.',
        weekNumber: 2,
        estimatedHours: 8,
        topics: [
          'Intermediate Models',
          'Practical Applications',
          'Case Studies',
        ],
      },
    ];
  }
}
