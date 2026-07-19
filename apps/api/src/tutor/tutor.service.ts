import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiEngine } from '../ai/ai.engine';
import { TutorPromptBuilder } from './services/tutor-prompt.builder';
import { ChatPromptDto } from './dto/chat-prompt.dto';
import * as express from 'express';
import { Subscription } from 'rxjs';
import { RetrievalService } from '../knowledge/services/retrieval.service';
import { RerankingService } from '../knowledge/services/reranking.service';
import { MemoryService } from '../knowledge/services/memory.service';

@Injectable()
export class TutorService {
  private readonly logger = new Logger(TutorService.name);
  private activeStreams = new Map<
    string,
    {
      subscription: Subscription;
      abortController: AbortController;
      getAccumulated: () => string;
      dto: ChatPromptDto;
      startTime: number;
    }
  >();

  constructor(
    private prisma: PrismaService,
    private aiEngine: AiEngine,
    private promptBuilder: TutorPromptBuilder,
    private retrievalService: RetrievalService,
    private rerankingService: RerankingService,
    private memoryService: MemoryService,
  ) {}

  async listConversations(userId: string) {
    return this.prisma.tutorConversation.findMany({
      where: { userId, deleted: false },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { messages: { where: { deleted: false } } },
        },
      },
    });
  }

  async createConversation(userId: string, title?: string) {
    return this.prisma.tutorConversation.create({
      data: {
        userId,
        title: title?.trim() || 'New Chat',
      },
    });
  }

  async getConversationDetails(userId: string, conversationId: string) {
    const conversation = await this.prisma.tutorConversation.findFirst({
      where: { id: conversationId, userId, deleted: false },
      include: {
        messages: {
          where: { deleted: false },
          orderBy: { createdAt: 'asc' },
          include: {
            responses: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async deleteConversation(userId: string, conversationId: string) {
    const conversation = await this.prisma.tutorConversation.findFirst({
      where: { id: conversationId, userId, deleted: false },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Soft delete
    await this.prisma.tutorConversation.update({
      where: { id: conversationId },
      data: { deleted: true },
    });

    return { success: true };
  }

  async renameConversation(
    userId: string,
    conversationId: string,
    title: string,
  ) {
    const conversation = await this.prisma.tutorConversation.findFirst({
      where: { id: conversationId, userId, deleted: false },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return this.prisma.tutorConversation.update({
      where: { id: conversationId },
      data: { title: title.trim() },
    });
  }

  stopActiveStream(userId: string, conversationId: string) {
    const key = `${userId}:${conversationId}`;
    const stream = this.activeStreams.get(key);
    if (stream) {
      stream.subscription.unsubscribe();
      stream.abortController.abort();

      const accumulated = stream.getAccumulated();
      if (accumulated.trim()) {
        const dto = stream.dto;
        const startTime = stream.startTime;
        this.prisma.tutorMessage
          .create({
            data: {
              conversationId,
              role: 'assistant',
              content: accumulated,
            },
          })
          .then((assistantMsg) => {
            this.prisma.tutorAssistantResponse
              .create({
                data: {
                  messageId: assistantMsg.id,
                  modelUsed: dto.model || 'gemini-2.5-flash',
                  promptTokens: Math.ceil(dto.prompt.length / 4),
                  completionTokens: Math.ceil(accumulated.length / 4),
                  latencyMs: Date.now() - startTime,
                },
              })
              .catch((dbErr: any) => {
                this.logger.error(
                  `Error saving metrics on stop: ${dbErr.message}`,
                );
              });
          })
          .catch((dbErr: any) => {
            this.logger.error(
              `Error saving partial response on stop: ${dbErr.message}`,
            );
          });
      }

      this.activeStreams.delete(key);
      this.logger.log(
        `Active generation stopped for user: ${userId}, chat: ${conversationId}`,
      );
      return { success: true };
    }
    return { success: false, message: 'No active generation found' };
  }

  async streamTutorResponse(
    userId: string,
    dto: ChatPromptDto,
    res: express.Response,
    clientDisconnected$?: any,
  ) {
    const startTime = Date.now();
    let conversationId = dto.conversationId;

    // 1. Resolve or create conversation
    let conversation;
    if (conversationId) {
      conversation = await this.prisma.tutorConversation.findFirst({
        where: { id: conversationId, userId, deleted: false },
      });
      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }
    } else {
      conversation = await this.createConversation(userId);
      conversationId = conversation.id;
    }

    const currentConv = conversation;
    const streamKey = `${userId}:${conversationId}`;

    // 1.5 Abort existing stream on key if any (prevent concurrent leaks)
    const existing = this.activeStreams.get(streamKey);
    if (existing) {
      existing.subscription.unsubscribe();
      existing.abortController.abort();
      this.activeStreams.delete(streamKey);
    }

    // Set headers for SSE streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.flushHeaders();

    // Send the conversation ID metadata first
    res.write(`data: [CONVERSATION_ID]: ${conversationId}\n\n`);

    // 2. Save user message to database
    await this.prisma.tutorMessage.create({
      data: {
        conversationId,
        role: 'user',
        content: dto.prompt,
      },
    });

    // Update conversation's updatedAt
    await this.prisma.tutorConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // 3. Compile prompt system and context instructions
    const systemPrompt = this.promptBuilder.buildSystemPrompt(dto.mode);
    const contextText = await this.promptBuilder.buildContextText(
      userId,
      dto.noteId,
      dto.notebookId,
    );

    // Retrieve cognitive memory context
    let memoryContext = '';
    try {
      memoryContext = await this.memoryService.compileMemoryContext(userId);
    } catch (e: any) {
      this.logger.warn(`Failed compiling memory context: ${e.message}`);
    }

    // Perform hybrid RAG search if documentIds are attached
    let documentCitationsText = '';
    const citations: any[] = [];
    if (dto.documentIds && dto.documentIds.length > 0) {
      try {
        const rawResults = await this.retrievalService.hybridSearch(
          userId,
          dto.prompt,
          dto.documentIds,
          undefined,
          5,
        );
        const reranked = await this.rerankingService.rerankResults(
          userId,
          rawResults,
        );

        if (reranked.length > 0) {
          const parts = reranked.map(
            (r, idx) =>
              `[Source ${idx + 1}] (File: ${r.documentName}, Page: ${r.pageNumber}):\n${r.content}`,
          );
          documentCitationsText = `RAG GROUNDED CITATIONS:\n${parts.join('\n\n')}`;

          reranked.forEach((r) => {
            citations.push({
              documentName: r.documentName,
              pageNumber: r.pageNumber,
              content: r.content,
              score: r.score,
            });
          });
        }
      } catch (e: any) {
        this.logger.error(`Failed executing hybrid search: ${e.message}`);
      }
    }

    // Write Citations to SSE before stream begins
    if (citations.length > 0) {
      res.write(`data: [CITATIONS]: ${JSON.stringify(citations)}\n\n`);
    }

    // Retrieve conversation history
    const historyMessages = await this.prisma.tutorMessage.findMany({
      where: { conversationId, deleted: false },
      orderBy: { createdAt: 'asc' },
    });

    let historyText = '';
    historyMessages.forEach((msg) => {
      historyText += `${msg.role.toUpperCase()}: ${msg.content}\n`;
    });

    const finalSystemInstruction = `${systemPrompt}
  
STUDENT LEARNING STYLE PROFILE AND LONG-TERM MEMORY:
${memoryContext || 'No profile established.'}

STUDENT STUDY MATERIAL CONTEXT:
${contextText || 'No specific note or notebook attached.'}

${documentCitationsText ? `${documentCitationsText}\n` : ''}
 
CHAT HISTORY:
${historyText || 'No previous messages.'}`;

    // 4. Call AI engine streaming
    const stream$ = this.aiEngine.stream(dto.prompt, finalSystemInstruction);

    const abortController = new AbortController();
    let accumulated = '';

    const subscription = stream$.subscribe({
      next: (chunk) => {
        accumulated += chunk;
        // Escape newlines for SSE format compatibility
        res.write(`data: ${chunk}\n\n`);
      },
      error: (err) => {
        this.logger.error(`Tutor stream error: ${err.message}`);
        if (accumulated.trim()) {
          this.prisma.tutorMessage
            .create({
              data: {
                conversationId,
                role: 'assistant',
                content: accumulated,
              },
            })
            .then((assistantMsg) => {
              this.prisma.tutorAssistantResponse
                .create({
                  data: {
                    messageId: assistantMsg.id,
                    modelUsed: dto.model || 'gemini-2.5-flash',
                    promptTokens: Math.ceil(dto.prompt.length / 4),
                    completionTokens: Math.ceil(accumulated.length / 4),
                    latencyMs: Date.now() - startTime,
                  },
                })
                .catch((dbErr: any) => {
                  this.logger.error(
                    `Error saving partial metrics: ${dbErr.message}`,
                  );
                });
            })
            .catch((dbErr: any) => {
              this.logger.error(
                `Error saving partial stream: ${dbErr.message}`,
              );
            });
        }
        res.write(`data: [ERROR]: ${err.message}\n\n`);
        res.end();
        this.activeStreams.delete(streamKey);
      },
      complete: () => {
        const completeAsync = async () => {
          try {
            // Save complete Assistant response
            const assistantMsg = await this.prisma.tutorMessage.create({
              data: {
                conversationId,
                role: 'assistant',
                content: accumulated,
              },
            });

            // Save AssistantResponse metadata
            await this.prisma.tutorAssistantResponse.create({
              data: {
                messageId: assistantMsg.id,
                modelUsed: dto.model || 'gemini-2.5-flash',
                promptTokens: Math.ceil(dto.prompt.length / 4),
                completionTokens: Math.ceil(accumulated.length / 4),
                latencyMs: Date.now() - startTime,
              },
            });

            // Update conversation title if this is the first turn and it has the default title
            const messageCount = await this.prisma.tutorMessage.count({
              where: { conversationId, deleted: false },
            });

            if (messageCount === 2 && currentConv.title === 'New Chat') {
              const generatedTitle = await this.aiEngine.generate(
                userId,
                'AI_TUTOR_TITLE',
                `Analyze the prompt and generate a concise conversation title of 3-6 words. No punctuation, no quotes. Prompt: ${dto.prompt}`,
                'You generate short, 3-6 word titles for conversations. Return ONLY the plain text of the title.',
              );
              const cleanedTitle = generatedTitle
                .trim()
                .replace(/^["']|["']$/g, '')
                .slice(0, 100);
              if (cleanedTitle) {
                await this.prisma.tutorConversation.update({
                  where: { id: conversationId },
                  data: { title: cleanedTitle },
                });
                res.write(`data: [TITLE]: ${cleanedTitle}\n\n`);
              }
            }
          } catch (dbErr: any) {
            this.logger.error(
              `Error saving stream response to database: ${dbErr.message}`,
            );
          } finally {
            res.write('data: [DONE]\n\n');
            res.end();
            this.activeStreams.delete(streamKey);
          }
        };
        completeAsync();
      },
    });

    this.activeStreams.set(streamKey, {
      subscription,
      abortController,
      getAccumulated: () => accumulated,
      dto,
      startTime,
    });

    // Handle client connection drop
    if (clientDisconnected$) {
      clientDisconnected$.subscribe(() => {
        const stream = this.activeStreams.get(streamKey);
        if (stream) {
          this.logger.log(
            `Client dropped connection. Aborting stream for conversation ${conversationId}`,
          );
          stream.subscription.unsubscribe();
          stream.abortController.abort();

          const currentAccumulated = stream.getAccumulated();
          if (currentAccumulated.trim()) {
            const currentDto = stream.dto;
            const currentStartTime = stream.startTime;
            this.prisma.tutorMessage
              .create({
                data: {
                  conversationId,
                  role: 'assistant',
                  content: currentAccumulated,
                },
              })
              .then((assistantMsg) => {
                this.prisma.tutorAssistantResponse
                  .create({
                    data: {
                      messageId: assistantMsg.id,
                      modelUsed: currentDto.model || 'gemini-2.5-flash',
                      promptTokens: Math.ceil(currentDto.prompt.length / 4),
                      completionTokens: Math.ceil(
                        currentAccumulated.length / 4,
                      ),
                      latencyMs: Date.now() - currentStartTime,
                    },
                  })
                  .catch((dbErr: any) => {
                    this.logger.error(
                      `Error saving metrics on disconnect: ${dbErr.message}`,
                    );
                  });
              })
              .catch((dbErr: any) => {
                this.logger.error(
                  `Error saving partial response on disconnect: ${dbErr.message}`,
                );
              });
          }
          this.activeStreams.delete(streamKey);
        }
      });
    }
  }

  async regenerateResponse(
    userId: string,
    conversationId: string,
    res: express.Response,
  ) {
    // 1. Verify access
    const conversation = await this.prisma.tutorConversation.findFirst({
      where: { id: conversationId, userId, deleted: false },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Find the last assistant message
    const lastAssistantMsg = await this.prisma.tutorMessage.findFirst({
      where: { conversationId, role: 'assistant', deleted: false },
      orderBy: { createdAt: 'desc' },
    });

    // Mark the last assistant message as deleted
    if (lastAssistantMsg) {
      await this.prisma.tutorMessage.update({
        where: { id: lastAssistantMsg.id },
        data: { deleted: true },
      });
    }

    // Find the last user message
    const lastUserMsg = await this.prisma.tutorMessage.findFirst({
      where: { conversationId, role: 'user', deleted: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastUserMsg) {
      throw new BadRequestException('No user message found to regenerate');
    }

    // Trigger stream using the last user prompt
    const promptDto: ChatPromptDto = {
      conversationId,
      prompt: lastUserMsg.content,
      model: 'gemini-2.5-flash',
    };

    return this.streamTutorResponse(userId, promptDto, res);
  }
}
