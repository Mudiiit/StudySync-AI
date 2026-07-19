import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PromptService {
  private readonly logger = new Logger(PromptService.name);

  // Default hardcoded fallbacks in case database has not yet been seeded
  private readonly fallbackTemplates: Record<
    string,
    { category: string; template: string; variables: string }
  > = {
    STUDY_PLANNER: {
      category: 'STUDY_PLANNER',
      template:
        'You are an elite academic tutor. Create a detailed study plan roadmap for the subject "{{subject}}". Objectives: "{{objectives}}". Focus areas: "{{focus}}". Format the output cleanly in markdown.',
      variables: 'subject,objectives,focus',
    },
    AI_TUTOR: {
      category: 'AI_TUTOR',
      template:
        'You are a patient and clear professor tutoring a student on "{{topic}}". Current conversation history:\n{{history}}\nAnswer the student: "{{input}}"',
      variables: 'topic,history,input',
    },
    NOTES_SUMMARY: {
      category: 'NOTES_SUMMARY',
      template:
        'You are an elite academic tutor. Summarize the following notes content in a concise layout with bullet points. Tone is "{{tone}}". Content:\n{{content}}',
      variables: 'tone,content',
    },
    FLASHCARDS: {
      category: 'FLASHCARDS',
      template:
        'Generate a deck of study flashcards for "{{topic}}". Return ONLY a valid JSON array of objects with front and back properties: [{"front": "Question", "back": "Answer"}]. Output no other text. Topic: "{{topic}}"',
      variables: 'topic',
    },
    QUIZ_GENERATOR: {
      category: 'QUIZ_GENERATOR',
      template:
        'Create a quiz for "{{topic}}" containing "{{count}}" questions of difficulty "{{difficulty}}". Return ONLY a valid JSON array matching the structure: [{"questionText": "Question text", "questionType": "MCQ", "explanation": "Explanation text", "options": [{"optionText": "Option Text", "isCorrect": true}]}]. Topic:\n{{topic}}',
      variables: 'topic,count,difficulty',
    },
    GRAMMAR_FIX: {
      category: 'GRAMMAR_FIX',
      template:
        'Correct any spelling, grammar, and punctuation mistakes in this academic text. Return ONLY the corrected text. Text:\n{{content}}',
      variables: 'content',
    },
    REWRITE: {
      category: 'REWRITE',
      template:
        'Rewrite the following text to sound highly "{{tone}}". Keep all equations and scientific terms. Text:\n{{content}}',
      variables: 'tone,content',
    },
    TRANSLATION: {
      category: 'TRANSLATION',
      template:
        'Translate the following academic text into the language "{{language}}". Text:\n{{content}}',
      variables: 'language,content',
    },
    TASK_BREAKDOWN: {
      category: 'TASK_BREAKDOWN',
      template:
        'Break down the task "{{title}}" (Description: "{{description}}") into 3 to 6 actionable checklist steps. Return ONLY a valid JSON string array: ["Step 1", "Step 2"]. Task:\n{{title}}',
      variables: 'title,description',
    },
  };

  constructor(private prisma: PrismaService) {}

  async getRenderedPrompt(
    key: string,
    variables: Record<string, string>,
  ): Promise<string> {
    // 1. Fetch template from DB or fallback preset
    let record = await this.prisma.promptTemplate.findUnique({
      where: { key },
    });

    if (!record) {
      const fallback = this.fallbackTemplates[key];
      if (fallback) {
        record = await this.prisma.promptTemplate.create({
          data: {
            key,
            category: fallback.category,
            template: fallback.template,
            variables: fallback.variables,
          },
        });
      } else {
        throw new Error(
          `Prompt template key '${key}' does not exist in library registry.`,
        );
      }
    }

    // 2. Perform variable interpolation
    let rendered = record.template;
    for (const [varName, varVal] of Object.entries(variables)) {
      rendered = rendered.replace(
        new RegExp(`{{\\s*${varName}\\s*}}`, 'g'),
        varVal,
      );
    }

    return rendered;
  }

  async updateTemplate(key: string, template: string): Promise<any> {
    const record = await this.prisma.promptTemplate.findUnique({
      where: { key },
    });
    const currentVersion = record ? record.version : 0;

    return this.prisma.promptTemplate.upsert({
      where: { key },
      update: { template, version: currentVersion + 1 },
      create: { key, template, category: 'GENERAL', variables: '' },
    });
  }
}
