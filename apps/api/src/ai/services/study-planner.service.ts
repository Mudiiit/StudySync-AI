import { Injectable } from '@nestjs/common';
import { AiEngine } from '../ai.engine';
import { PromptService } from '../prompt.service';

@Injectable()
export class StudyPlannerService {
  constructor(
    private aiEngine: AiEngine,
    private promptService: PromptService,
  ) {}

  async generateRoadmap(
    userId: string,
    subject: string,
    objectives: string,
    focus: string,
  ): Promise<string> {
    const prompt = await this.promptService.getRenderedPrompt('STUDY_PLANNER', {
      subject,
      objectives,
      focus,
    });

    return this.aiEngine.generate(
      userId,
      'STUDY_PLANNER',
      prompt,
      'You are an elite academic roadmap designer.',
    );
  }
}
