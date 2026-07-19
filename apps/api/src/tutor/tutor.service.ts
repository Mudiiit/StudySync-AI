import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiEngine } from '../ai/ai.engine';
import { ChatRole } from '@prisma/client';
import { Observable } from 'rxjs';

@Injectable()
export class TutorService {
  constructor(
    private prisma: PrismaService,
    private aiEngine: AiEngine,
  ) {}

  async listConversations(userId: string) {
    return this.prisma.chatConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });
  }

  async createConversation(userId: string, title?: string) {
    return this.prisma.chatConversation.create({
      data: {
        userId,
        title: title?.trim() || 'New Discussion',
      },
    });
  }

  async getConversationDetails(userId: string, conversationId: string) {
    const conversation = await this.prisma.chatConversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async deleteConversation(userId: string, conversationId: string) {
    // Verify ownership
    const conversation = await this.prisma.chatConversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.prisma.chatConversation.delete({
      where: { id: conversationId },
    });

    return { success: true };
  }

  async renameConversation(
    userId: string,
    conversationId: string,
    title: string,
  ) {
    // Verify ownership
    const conversation = await this.prisma.chatConversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: { title: title.trim() },
    });
  }

  async streamTutorResponse(
    userId: string,
    conversationId: string,
    prompt: string,
    filters: { noteId?: string; notebookId?: string; mode?: string },
  ): Promise<Observable<string>> {
    // 1. Verify conversation access
    const conversation = await this.prisma.chatConversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conversation) {
      throw new UnauthorizedException('Access denied');
    }

    // 2. Save user message to database
    await this.prisma.chatMessage.create({
      data: {
        conversationId,
        role: ChatRole.USER,
        content: prompt,
      },
    });

    // Update conversation's updatedAt
    await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // 3. Compile context from user materials
    let contextText = '';

    // Notebook context
    if (filters.notebookId) {
      const notebook = await this.prisma.notebook.findFirst({
        where: { id: filters.notebookId, userId },
      });
      if (notebook) {
        contextText += `\n=== NOTEBOOK CONTEXT ===\nNotebook Title: ${notebook.title}\nDescription: ${notebook.description || 'N/A'}\n`;
        // Load active notebook notes
        const notes = await this.prisma.note.findMany({
          where: {
            notebookId: filters.notebookId,
            userId,
            deleted: false,
            archived: false,
          },
          select: { title: true, content: true },
        });
        if (notes.length > 0) {
          contextText += `Notes inside notebook:\n`;
          notes.forEach((n) => {
            contextText += `- Note Title: "${n.title}"\n  Content excerpt:\n  """\n  ${n.content.slice(0, 1000)}\n  """\n`;
          });
        }
      }
    }

    // Selected Note context
    if (filters.noteId) {
      const note = await this.prisma.note.findFirst({
        where: { id: filters.noteId, userId },
      });
      if (note) {
        contextText += `\n=== ACTIVE NOTE CONTEXT ===\nNote Title: ${note.title}\nContent:\n"""\n${note.content}\n"""\n`;
        if (note.summary) {
          contextText += `AI Summary of Note: ${note.summary}\n`;
        }
      }
    }

    // Flashcards context
    const flashcards = await this.prisma.flashcard.findMany({
      where: {
        userId,
        OR: [
          filters.noteId ? { noteId: filters.noteId } : null,
          filters.notebookId ? { notebookId: filters.notebookId } : null,
        ].filter(Boolean) as any,
      },
      select: { question: true, answer: true, explanation: true },
      take: 20,
    });
    if (flashcards.length > 0) {
      contextText += `\n=== RELATED FLASHCARDS ===\n`;
      flashcards.forEach((f, idx) => {
        contextText += `Card ${idx + 1}: Q: "${f.question}" | A: "${f.answer}" ${f.explanation ? `(Explanation: ${f.explanation})` : ''}\n`;
      });
    }

    // Quiz performance context
    const quizzes = await this.prisma.quiz.findMany({
      where: {
        userId,
        OR: [
          filters.noteId ? { noteId: filters.noteId } : null,
          filters.notebookId ? { notebookId: filters.notebookId } : null,
        ].filter(Boolean) as any,
      },
      include: {
        attempts: {
          where: { completedAt: { not: null } },
          orderBy: { startedAt: 'desc' },
          take: 2,
        },
      },
      take: 5,
    });
    if (quizzes.length > 0) {
      contextText += `\n=== RECENT QUIZ PERFORMANCE ===\n`;
      quizzes.forEach((q) => {
        const attemptsStr = q.attempts
          .map((a) => `${a.score}/${q.questionCount} (${a.percentage}%)`)
          .join(', ');
        contextText += `- Quiz: "${q.title}" | Difficulty: ${q.difficulty} | Recent completion percentages: [${attemptsStr || 'No completions yet'}]\n`;
      });
    }

    // 4. Retrieve conversation history
    const historyMessages = await this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    let historyText = '';
    historyMessages.forEach((msg) => {
      historyText += `${msg.role}: ${msg.content}\n`;
    });

    // 5. Structure system prompt based on mode
    let modeInstruction = '';
    switch (filters.mode) {
      case 'eli5':
        modeInstruction =
          "Mode: ELI5 (Explain Like I'm 5). Use simple analogies, zero academic jargon, and explain as if talking to a child.";
        break;
      case 'socratic':
        modeInstruction =
          'Mode: Socratic Method. Do not give direct answers. Instead, respond with guiding questions that lead the student to realize the answer themselves.';
        break;
      case 'professor':
        modeInstruction =
          'Mode: Professor. Offer detailed, formal, lecture-style explanations containing deep breakdowns, key vocabulary, and strict academic reasoning.';
        break;
      case 'exam':
        modeInstruction =
          'Mode: Exam Prep. Highlight predictable exam topics, how scoring matrices work, common pitfalls, and write highly testable tips.';
        break;
      case 'debug':
        modeInstruction =
          'Mode: Code Debugging. Detail how variables change state, identify syntactic/logic bugs, provide code snippets, and list correct implementations.';
        break;
      default:
        modeInstruction =
          'Mode: Standard academic tutoring. Give structured explanations using lists, headings, and tables.';
    }

    const systemInstruction = `You are StudySync AI's Enterprise AI Tutor, an elite academic personal teacher.
Your goal is to help the student master their study materials by providing highly personalized, clear, and comprehensive explanations, similar to a patient and expert professor.

Guidelines for your responses:
- Ground your answers in the student's actual materials. Refer to their notes or notebooks where appropriate.
- Explain concepts clearly. Use markdown headings, bullet points, numbered lists, clean tables, and code blocks with syntax highlighting where relevant.
- Include LaTeX mathematical notation using standard delimiters (e.g. \\(...\\) for inline and \\[...\\] for block math) when explaining math or formulas.
- Enhance your explanations with:
  - Real-life analogies to simplify complex topics.
  - "Important Notes" and "Common Mistakes" sections.
  - "Exam Tips" to help them prepare.
- ${modeInstruction}

STUDENT STUDY MATERIAL CONTEXT:
${contextText || 'No specific note or notebook attached. Answer generally using standard tutoring best practices.'}

CHAT HISTORY:
${historyText || 'No previous messages.'}`;

    // 6. Call AI engine streaming
    const stream$ = this.aiEngine.stream(prompt, systemInstruction);

    // 7. Accumulate chunks in RxJS stream and save complete assistant response on complete
    let accumulated = '';
    return new Observable<string>((subscriber) => {
      const subscription = stream$.subscribe({
        next: (chunk) => {
          accumulated += chunk;
          subscriber.next(chunk);
        },
        error: (err) => {
          subscriber.error(err);
        },
        complete: () => {
          this.prisma.chatMessage
            .create({
              data: {
                conversationId,
                role: ChatRole.ASSISTANT,
                content: accumulated,
              },
            })
            .then(async () => {
              try {
                const count = await this.prisma.chatMessage.count({
                  where: { conversationId },
                });
                if (count === 2) {
                  // Only auto-generate title if it hasn't been manually renamed yet
                  const currentConv =
                    await this.prisma.chatConversation.findUnique({
                      where: { id: conversationId },
                    });
                  if (currentConv && currentConv.title === 'New Discussion') {
                    const firstUserMsg =
                      await this.prisma.chatMessage.findFirst({
                        where: { conversationId, role: ChatRole.USER },
                        orderBy: { createdAt: 'asc' },
                      });
                    if (firstUserMsg && firstUserMsg.content) {
                      const titlePrompt = `Analyze the student's message and generate a concise conversation title of 3-8 words. Avoid punctuation, quotes, introduction, or prefixing. Return ONLY the plain text of the title. Student message:\n${firstUserMsg.content}`;
                      const generatedTitle = await this.aiEngine.generate(
                        userId,
                        'AI_TUTOR_TITLE',
                        titlePrompt,
                        'You generate short, 3-8 word titles for dialogue threads. Do not add quotes or punctuation.',
                      );
                      const cleanedTitle = generatedTitle
                        .trim()
                        .replace(/^["']|["']$/g, '')
                        .slice(0, 100);
                      if (cleanedTitle) {
                        await this.prisma.chatConversation.update({
                          where: { id: conversationId },
                          data: { title: cleanedTitle },
                        });
                      }
                    }
                  }
                }
              } catch (titleError) {
                console.error(
                  'Failed to auto-generate conversation title:',
                  titleError,
                );
              } finally {
                subscriber.complete();
              }
            })
            .catch((dbErr) => {
              subscriber.error(dbErr);
            });
        },
      });

      return () => subscription.unsubscribe();
    });
  }
}
