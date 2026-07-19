import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiEngine } from '../ai/ai.engine';
import { GenerateQuizDto } from './dto/generate-quiz.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { QuestionType, QuizStatus, Difficulty } from '@prisma/client';

interface AiGeneratedChoice {
  text: string;
  isCorrect: boolean;
}

interface AiGeneratedQuestion {
  question: string;
  type: 'MCQ' | 'TRUE_FALSE';
  explanation?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  choices: AiGeneratedChoice[];
}

@Injectable()
export class QuizzesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiEngine: AiEngine,
  ) {}

  async generateQuizFromNote(
    userId: string,
    noteId: string,
    dto: GenerateQuizDto,
  ) {
    const note = await this.prisma.note.findFirst({
      where: { id: noteId, userId },
    });
    if (!note) {
      throw new NotFoundException('Note not found');
    }

    const content = note.markdown || note.content;
    if (!content || content.trim().length === 0) {
      throw new BadRequestException(
        'Note content is empty, cannot generate quiz',
      );
    }

    return this.generateQuizContent(
      userId,
      note.title,
      content,
      dto,
      noteId,
      null,
    );
  }

  async generateQuizFromNotebook(
    userId: string,
    notebookId: string,
    dto: GenerateQuizDto,
  ) {
    const notebook = await this.prisma.notebook.findFirst({
      where: { id: notebookId, userId },
      include: { notes: true },
    });
    if (!notebook) {
      throw new NotFoundException('Notebook not found');
    }

    const combinedContent = notebook.notes
      .map((n) => n.markdown || n.content)
      .filter(Boolean)
      .join('\n\n');

    if (!combinedContent || combinedContent.trim().length === 0) {
      throw new BadRequestException(
        'Notebook has no content in its notes to generate a quiz',
      );
    }

    return this.generateQuizContent(
      userId,
      notebook.title,
      combinedContent,
      dto,
      null,
      notebookId,
    );
  }

  async generateQuizFromSelection(
    userId: string,
    selectionText: string,
    dto: GenerateQuizDto,
  ) {
    if (!selectionText || selectionText.trim().length === 0) {
      throw new BadRequestException(
        'Selection content is empty, cannot generate quiz',
      );
    }

    return this.generateQuizContent(
      userId,
      'Selection Snippet',
      selectionText,
      dto,
      null,
      null,
    );
  }

  private async generateQuizContent(
    userId: string,
    sourceTitle: string,
    content: string,
    dto: GenerateQuizDto,
    noteId: string | null,
    notebookId: string | null,
  ) {
    const prompt = `You are an elite academic examiner. Create a quiz containing exactly ${dto.questionCount} questions of difficulty "${dto.difficulty}" based on the text.
The questions must be either Multiple Choice ("MCQ") or True/False ("TRUE_FALSE").
For MCQ, provide exactly 4 choices (one correct, three incorrect).
For TRUE_FALSE, provide exactly 2 choices ("True" and "False", one correct, one incorrect).

Return ONLY a valid JSON array matching the structure:
[
  {
    "question": "Question text here?",
    "type": "MCQ" or "TRUE_FALSE",
    "explanation": "Brief explanation of why the correct answer is correct.",
    "difficulty": "EASY" or "MEDIUM" or "HARD",
    "choices": [
      {
        "text": "Choice Option 1",
        "isCorrect": true
      },
      ...
    ]
  }
]

Text content to generate quiz from:
${content}
`;

    try {
      const response = await this.aiEngine.generate(
        userId,
        'QUIZ_GENERATION',
        prompt,
        'You are an examiner generating tests. Return ONLY raw JSON array formats.',
        { responseMimeType: 'application/json' },
      );

      const cleaned = response
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      const generatedQuestions = JSON.parse(cleaned) as AiGeneratedQuestion[];

      if (
        !Array.isArray(generatedQuestions) ||
        generatedQuestions.length === 0
      ) {
        throw new Error('Invalid JSON format returned by AI');
      }

      // Basic structure validation
      for (const q of generatedQuestions) {
        if (
          !q.question ||
          !q.type ||
          !Array.isArray(q.choices) ||
          q.choices.length === 0
        ) {
          throw new Error(
            'Question is missing required properties or choices list',
          );
        }
        const correctCount = q.choices.filter((c) => c.isCorrect).length;
        if (correctCount !== 1) {
          throw new Error(
            `Question "${q.question}" must have exactly one correct choice, got ${correctCount}`,
          );
        }
      }

      // Save to database
      const quiz = await this.prisma.quiz.create({
        data: {
          title: `Quiz: ${sourceTitle}`,
          description: `Generated from ${sourceTitle}`,
          userId,
          noteId,
          notebookId,
          difficulty: dto.difficulty,
          questionCount: generatedQuestions.length,
          estimatedTime: Math.max(
            2,
            Math.ceil(generatedQuestions.length * 1.5),
          ),
          aiGenerated: true,
          status: QuizStatus.PUBLISHED,
          questions: {
            create: generatedQuestions.map((q, idx) => ({
              type:
                q.type === 'TRUE_FALSE'
                  ? QuestionType.TRUE_FALSE
                  : QuestionType.MCQ,
              question: q.question,
              explanation: q.explanation || null,
              difficulty: (q.difficulty as Difficulty) || dto.difficulty,
              order: idx,
              choices: {
                create: q.choices.map((c) => ({
                  text: c.text,
                  isCorrect: c.isCorrect,
                })),
              },
            })),
          },
        },
        include: {
          questions: {
            include: {
              choices: true,
            },
          },
        },
      });

      return quiz;
    } catch (error: any) {
      const errMsg = error.message || '';
      const status =
        error.status || error.statusCode || error.response?.status || 500;

      // Log full Google/Gemini API error only in backend console
      console.error(
        '[QuizzesService] Full Gemini API Error captured on backend:',
        error,
      );

      if (
        status === 429 ||
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('quota') ||
        errMsg.includes('limit reached')
      ) {
        throw new HttpException(
          'AI usage limit reached. Please try again in a few minutes.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      if (
        status === 503 ||
        errMsg.includes('503') ||
        errMsg.includes('unavailable') ||
        errMsg.includes('overloaded')
      ) {
        throw new HttpException(
          'AI service is temporarily unavailable.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      if (
        status === 504 ||
        errMsg.includes('timeout') ||
        errMsg.includes('deadline exceeded') ||
        errMsg.includes('took too long') ||
        errMsg.includes('ETIMEDOUT')
      ) {
        throw new HttpException(
          'The AI request timed out. Please try again.',
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }

      if (
        status === 401 ||
        status === 403 ||
        errMsg.includes('401') ||
        errMsg.includes('403') ||
        errMsg.includes('API_KEY_INVALID') ||
        errMsg.includes('API key') ||
        errMsg.includes('unauthorized') ||
        errMsg.includes('forbidden')
      ) {
        throw new HttpException(
          'AI service configuration error.',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Default unknown AI error
      throw new HttpException(
        'Something went wrong while generating your quiz.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getQuizzes(userId: string) {
    return this.prisma.quiz.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        note: { select: { id: true, title: true } },
        notebook: { select: { id: true, title: true } },
      },
    });
  }

  async getQuiz(userId: string, quizId: string) {
    const quiz = await this.prisma.quiz.findFirst({
      where: {
        id: quizId,
        OR: [
          { userId },
          {
            id: {
              in: await this.prisma.groupResource
                .findMany({
                  where: {
                    resourceType: 'QUIZ',
                    resourceId: quizId,
                    group: {
                      members: {
                        some: {
                          userId,
                        },
                      },
                    },
                  },
                  select: {
                    resourceId: true,
                  },
                })
                .then((res) => res.map((r) => r.resourceId)),
            },
          },
        ],
      },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            choices: true,
          },
        },
      },
    });
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }
    return quiz;
  }

  async deleteQuiz(userId: string, quizId: string) {
    const quiz = await this.prisma.quiz.findFirst({
      where: { id: quizId, userId },
    });
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    await this.prisma.quiz.delete({
      where: { id: quizId },
    });

    return { success: true };
  }

  async startAttempt(userId: string, quizId: string) {
    const quiz = await this.prisma.quiz.findFirst({
      where: {
        id: quizId,
        OR: [
          { userId },
          {
            id: {
              in: await this.prisma.groupResource
                .findMany({
                  where: {
                    resourceType: 'QUIZ',
                    resourceId: quizId,
                    group: {
                      members: {
                        some: {
                          userId,
                        },
                      },
                    },
                  },
                  select: {
                    resourceId: true,
                  },
                })
                .then((res) => res.map((r) => r.resourceId)),
            },
          },
        ],
      },
    });
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    return this.prisma.attempt.create({
      data: {
        quizId,
        userId,
        score: 0,
        percentage: 0,
        duration: 0,
      },
    });
  }

  async submitAttempt(userId: string, attemptId: string, dto: SubmitQuizDto) {
    const attempt = await this.prisma.attempt.findFirst({
      where: { id: attemptId, userId },
      include: {
        quiz: {
          include: {
            questions: {
              include: {
                choices: true,
              },
            },
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException('Quiz attempt not found');
    }

    if (attempt.completedAt) {
      throw new BadRequestException(
        'This quiz attempt has already been submitted',
      );
    }

    const questions = attempt.quiz.questions;
    let correctCount = 0;
    const attemptAnswersData: any[] = [];

    for (const question of questions) {
      const submittedAnswer = dto.answers.find(
        (a) => a.questionId === question.id,
      );
      const selectedChoiceId = submittedAnswer?.selectedChoiceId || null;

      let isCorrect = false;
      if (selectedChoiceId) {
        const choice = question.choices.find((c) => c.id === selectedChoiceId);
        if (choice && choice.isCorrect) {
          isCorrect = true;
          correctCount++;
        }
      }

      attemptAnswersData.push({
        attemptId,
        questionId: question.id,
        selectedChoiceId,
        isCorrect,
      });
    }

    const totalQuestions = questions.length;
    const score = correctCount;
    const percentage =
      totalQuestions > 0
        ? parseFloat(((correctCount / totalQuestions) * 100).toFixed(2))
        : 0;
    const completedAt = new Date();
    const duration = Math.ceil(
      (completedAt.getTime() - attempt.startedAt.getTime()) / 1000,
    );

    // Save answer logs and update attempt metadata inside a transaction
    await this.prisma.$transaction([
      this.prisma.attemptAnswer.createMany({
        data: attemptAnswersData,
      }),
      this.prisma.attempt.update({
        where: { id: attemptId },
        data: {
          score,
          percentage,
          completedAt,
          duration,
        },
      }),
    ]);

    return this.prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        answers: {
          include: {
            question: {
              include: {
                choices: true,
              },
            },
            selectedChoice: true,
          },
        },
      },
    });
  }

  async getAttemptsHistory(userId: string) {
    return this.prisma.attempt.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            questionCount: true,
          },
        },
      },
    });
  }

  async getAttempt(userId: string, attemptId: string) {
    const attempt = await this.prisma.attempt.findFirst({
      where: { id: attemptId, userId },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            description: true,
            questionCount: true,
          },
        },
        answers: {
          include: {
            question: {
              include: {
                choices: true,
              },
            },
            selectedChoice: true,
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException('Attempt not found');
    }

    return attempt;
  }
}
