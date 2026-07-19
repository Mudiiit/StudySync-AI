import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiEngine } from './ai.engine';
import { ChatRole } from '@prisma/client';

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);
  private readonly maxContextMessages = 12;

  constructor(
    private prisma: PrismaService,
    private aiEngine: AiEngine,
  ) {}

  async loadConversationContext(conversationId: string): Promise<string> {
    const messages = await this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    // If message size exceeds thresholds, summarize history
    if (messages.length > this.maxContextMessages) {
      await this.summarizeOldHistory(conversationId, messages);
      // Reload truncated messages
      const updatedMessages = await this.prisma.chatMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
      });
      return this.formatHistory(updatedMessages);
    }

    return this.formatHistory(messages);
  }

  private formatHistory(messages: any[]): string {
    return messages
      .map(
        (m) =>
          `${m.role === ChatRole.USER ? 'Student' : 'Tutor'}: ${m.content}`,
      )
      .join('\n');
  }

  private async summarizeOldHistory(conversationId: string, messages: any[]) {
    this.logger.log(
      `Truncating and summarizing conversation history for: ${conversationId}`,
    );

    // Split: summarize first N-4 messages
    const toSummarize = messages.slice(0, messages.length - 4);
    const toRetain = messages.slice(messages.length - 4);

    const historyStr = this.formatHistory(toSummarize);
    const summaryPrompt = `Summarize the key questions, notes, and progress discussed in this tutoring dialogue thread into 2 sentences:\n\n${historyStr}`;

    try {
      const summaryText = await this.aiEngine.generate(
        'SYSTEM',
        'SYSTEM_SUMMARIZE',
        summaryPrompt,
        'You are a clear and concise assistant summarising conversation logs.',
        { bypassCache: true },
      );

      // Perform atomic truncation in DB
      await this.prisma.$transaction(async (tx) => {
        // 1. Delete old messages
        const idsToDelete = toSummarize.map((m) => m.id);
        await tx.chatMessage.deleteMany({
          where: { id: { in: idsToDelete } },
        });

        // 2. Inject summary as system role prefix header
        await tx.chatMessage.create({
          data: {
            conversationId,
            role: ChatRole.SYSTEM,
            content: `[Previous conversation summary: ${summaryText}]`,
            createdAt: new Date(Date.now() - 1000 * 60), // Set slightly in the past
          },
        });
      });
    } catch (e: any) {
      this.logger.error(
        `Failed to summarize dialogue log details: ${e.message}`,
      );
    }
  }
}
