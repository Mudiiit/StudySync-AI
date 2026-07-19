import { Injectable } from '@nestjs/common';
import { AiEngine } from '../ai.engine';
import { PromptService } from '../prompt.service';

@Injectable()
export class NotesIntelService {
  constructor(
    private aiEngine: AiEngine,
    private promptService: PromptService,
  ) {}

  async summarizeNote(
    userId: string,
    content: string,
    tone = 'professional',
  ): Promise<string> {
    const prompt = await this.promptService.getRenderedPrompt('NOTES_SUMMARY', {
      content,
      tone,
    });
    return this.aiEngine.generate(
      userId,
      'NOTES_SUMMARY',
      prompt,
      'You are a meticulous summary assistant.',
    );
  }

  async rewriteNote(
    userId: string,
    content: string,
    tone = 'academic',
  ): Promise<string> {
    const prompt = await this.promptService.getRenderedPrompt('REWRITE', {
      content,
      tone,
    });
    return this.aiEngine.generate(
      userId,
      'REWRITE',
      prompt,
      'You are an academic advisor writing assistant.',
    );
  }

  async fixGrammar(userId: string, content: string): Promise<string> {
    const prompt = await this.promptService.getRenderedPrompt('GRAMMAR_FIX', {
      content,
    });
    return this.aiEngine.generate(
      userId,
      'GRAMMAR_FIX',
      prompt,
      'You are a meticulous proofreader.',
    );
  }

  async translateNote(
    userId: string,
    content: string,
    language: string,
  ): Promise<string> {
    const prompt = await this.promptService.getRenderedPrompt('TRANSLATION', {
      content,
      language,
    });
    return this.aiEngine.generate(
      userId,
      'TRANSLATION',
      prompt,
      'You are a professional multilingual translator.',
    );
  }
}
