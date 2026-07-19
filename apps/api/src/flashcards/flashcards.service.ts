import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FlashcardAiService } from './flashcard-ai.service';
import { create } from 'domain';

@Injectable()
export class FlashcardsService {
  private readonly logger = new Logger(FlashcardsService.name);

  constructor(
    private prisma: PrismaService,
    private ai: FlashcardAiService,
  ) {}

  // ==========================================
  // SM-2 SPACED REPETITION MATH
  // ==========================================

  calculateSm2(
    rating: number, // 0: Again, 1: Hard, 2: Good, 3: Easy
    easeFactor: number,
    repetitions: number,
    intervalDays: number,
  ): {
    easeFactor: number;
    repetitions: number;
    intervalDays: number;
  } {
    // Map user ratings to SM-2 quality (0 to 5)
    // 0: Again -> quality 1 (incorrect)
    // 1: Hard  -> quality 3 (correct but difficult)
    // 2: Good  -> quality 4 (correct after hesitation)
    // 3: Easy  -> quality 5 (perfect response)
    let q = 1;
    if (rating === 1) q = 3;
    else if (rating === 2) q = 4;
    else if (rating === 3) q = 5;

    let nextEaseFactor = easeFactor;
    let nextRepetitions = repetitions;
    let nextIntervalDays = intervalDays;

    if (q < 3) {
      // Incorrect response: reset repetition sequence
      nextRepetitions = 0;
      nextIntervalDays = 1; // review tomorrow
    } else {
      // Correct response: increment repetitions and compute interval
      if (nextRepetitions === 0) {
        nextIntervalDays = 1;
      } else if (nextRepetitions === 1) {
        nextIntervalDays = 6;
      } else {
        nextIntervalDays = Math.round(intervalDays * easeFactor);
      }
      nextRepetitions += 1;
    }

    // Update Ease Factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    nextEaseFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if (nextEaseFactor < 1.3) {
      nextEaseFactor = 1.3; // ease factor floor
    }

    return {
      easeFactor: parseFloat(nextEaseFactor.toFixed(2)),
      repetitions: nextRepetitions,
      intervalDays: nextIntervalDays,
    };
  }

  // ==========================================
  // FLASHCARD CRUD
  // ==========================================

  async create(
    userId: string,
    data: {
      question: string;
      answer: string;
      hint?: string;
      explanation?: string;
      difficulty?: string;
      tags?: string[];
      noteId?: string;
      notebookId?: string;
    },
  ) {
    return this.prisma.flashcard.create({
      data: {
        userId,
        question: data.question,
        answer: data.answer,
        hint: data.hint || null,
        explanation: data.explanation || null,
        difficulty: data.difficulty || 'medium',
        tags: data.tags || [],
        noteId: data.noteId || null,
        notebookId: data.notebookId || null,
        front: data.question, // Backwards-compatibility
        back: data.answer,
      },
    });
  }

  async findAll(
    userId: string,
    filters: {
      search?: string;
      notebookId?: string;
      noteId?: string;
      deckId?: string;
      difficulty?: string;
      aiGenerated?: boolean;
      isFavorite?: boolean;
      tag?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    // Get all deck/resource IDs linked to groups this user is in
    const groupLinkedResourceIds = await this.prisma.groupResource
      .findMany({
        where: {
          resourceType: { in: ['FLASHCARD_DECK', 'FLASHCARD'] },
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
      .then((res) => res.map((r) => r.resourceId));

    const where: any = {
      OR: [
        { userId },
        { id: { in: groupLinkedResourceIds } },
        { deckId: { in: groupLinkedResourceIds } },
      ],
    };

    if (filters.deckId) {
      where.deckId = filters.deckId;
    }

    if (filters.notebookId) {
      where.notebookId = filters.notebookId;
    }
    if (filters.noteId) {
      where.noteId = filters.noteId;
    }
    if (filters.difficulty) {
      where.difficulty = filters.difficulty;
    }
    if (filters.aiGenerated !== undefined) {
      where.aiGenerated = filters.aiGenerated;
    }
    if (filters.isFavorite !== undefined) {
      where.isFavorite = filters.isFavorite;
    }
    if (filters.tag) {
      where.tags = { has: filters.tag };
    }
    if (filters.search) {
      where.OR = [
        { question: { contains: filters.search, mode: 'insensitive' } },
        { answer: { contains: filters.search, mode: 'insensitive' } },
        { explanation: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.flashcard.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          note: { select: { title: true } },
          notebook: { select: { title: true } },
          spacedRep: { where: { userId } },
        },
      }),
      this.prisma.flashcard.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(userId: string, id: string) {
    const groupLinkedResourceIds = await this.prisma.groupResource
      .findMany({
        where: {
          resourceType: { in: ['FLASHCARD_DECK', 'FLASHCARD'] },
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
      .then((res) => res.map((r) => r.resourceId));

    const card = await this.prisma.flashcard.findFirst({
      where: {
        id,
        OR: [
          { userId },
          { id: { in: groupLinkedResourceIds } },
          { deckId: { in: groupLinkedResourceIds } },
        ],
      },
      include: {
        note: { select: { title: true } },
        notebook: { select: { title: true } },
        spacedRep: { where: { userId } },
      },
    });

    if (!card) {
      throw new NotFoundException('Flashcard not found');
    }
    return card;
  }

  async update(
    userId: string,
    id: string,
    data: {
      question?: string;
      answer?: string;
      hint?: string;
      explanation?: string;
      difficulty?: string;
      tags?: string[];
      isFavorite?: boolean;
    },
  ) {
    await this.findOne(userId, id); // validates ownership

    const updateData: any = { ...data };
    if (data.question) updateData.front = data.question;
    if (data.answer) updateData.back = data.answer;

    return this.prisma.flashcard.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.flashcard.delete({ where: { id } });
  }

  // ==========================================
  // SPACED REPETITION ENGINE & DUE QUEUE
  // ==========================================

  async getDueCards(userId: string) {
    const now = new Date();

    // Due cards satisfy:
    // 1. Never reviewed before (no SpacedRepetition record exists), OR
    // 2. Scheduled for review now or in the past (nextReview <= now)
    return this.prisma.flashcard.findMany({
      where: {
        userId,
        OR: [
          {
            spacedRep: {
              none: { userId },
            },
          },
          {
            spacedRep: {
              some: {
                userId,
                nextReview: { lte: now },
              },
            },
          },
        ],
      },
      include: {
        note: { select: { title: true } },
        notebook: { select: { title: true } },
        spacedRep: { where: { userId } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async reviewCard(
    userId: string,
    cardId: string,
    rating: number, // 0: Again, 1: Hard, 2: Good, 3: Easy
  ) {
    const card = await this.findOne(userId, cardId);

    // Retrieve current SM-2 state
    let spacedRep = card.spacedRep[0];
    let easeFactor = 2.5;
    let repetitions = 0;
    let intervalDays = 0;

    if (spacedRep) {
      easeFactor = spacedRep.easeFactor;
      repetitions = spacedRep.repetitions;
      intervalDays = spacedRep.intervalDays;
    }

    // Process new SM-2 parameters
    const nextParams = this.calculateSm2(
      rating,
      easeFactor,
      repetitions,
      intervalDays,
    );

    const now = new Date();
    const nextReviewDate = new Date();
    nextReviewDate.setDate(now.getDate() + nextParams.intervalDays);

    // 1. Update/Create SpacedRepetition metadata
    if (spacedRep) {
      spacedRep = await this.prisma.spacedRepetition.update({
        where: { id: spacedRep.id },
        data: {
          easeFactor: nextParams.easeFactor,
          repetitions: nextParams.repetitions,
          intervalDays: nextParams.intervalDays,
          nextReview: nextReviewDate,
        },
      });
    } else {
      spacedRep = await this.prisma.spacedRepetition.create({
        data: {
          userId,
          flashcardId: cardId,
          easeFactor: nextParams.easeFactor,
          repetitions: nextParams.repetitions,
          intervalDays: nextParams.intervalDays,
          nextReview: nextReviewDate,
        },
      });
    }

    // 2. Append review transaction log
    const reviewLog = await this.prisma.review.create({
      data: {
        flashcardId: cardId,
        rating,
        interval: nextParams.intervalDays,
        repetitions: nextParams.repetitions,
        easeFactor: nextParams.easeFactor,
        nextReview: nextReviewDate,
        lastReviewed: now,
      },
    });

    return {
      success: true,
      nextReview: nextReviewDate,
      intervalDays: nextParams.intervalDays,
      spacedRep,
      reviewLog,
    };
  }

  // ==========================================
  // AI GENERATION TRIGGERS
  // ==========================================

  async generateFromNote(
    userId: string,
    noteId: string,
    type: 'recall' | 'conceptual' | 'scenario' | 'interview',
    quantity: number,
  ) {
    console.log(
      '[FlashcardsService] generateFromNote started. noteId:',
      noteId,
    );
    const note = await this.prisma.note.findFirst({
      where: { id: noteId, userId },
    });
    if (!note) throw new NotFoundException('Note not found');

    const sourceText =
      note.markdown || note.autoSaveContent || note.content || '';

    console.log('[FlashcardsService] Fetched note details:');
    console.log(' - note.id:', note.id);
    console.log(' - note.title:', note.title);
    console.log(' - markdown length:', note.markdown?.length || 0);
    console.log(
      ' - autoSaveContent length:',
      note.autoSaveContent?.length || 0,
    );
    console.log(' - content length:', note.content?.length || 0);
    console.log(' - final sourceText length:', sourceText.length);
    console.log(
      ' - markdown preview (first 200 chars):',
      sourceText.slice(0, 200),
    );

    if (!sourceText.trim()) {
      console.error(
        '[FlashcardsService] Generation aborted: Source text is empty!',
      );
      throw new Error('Cannot generate flashcards from an empty note.');
    }

    const generated = await this.ai.generateCards(
      userId,
      sourceText,
      type,
      quantity,
    );

    const createdCards = await this.prisma.$transaction(
      generated.map((c) =>
        this.prisma.flashcard.create({
          data: {
            userId,
            noteId,
            notebookId: note.notebookId,
            question: c.question,
            answer: c.answer,
            hint: c.hint || null,
            explanation: c.explanation || null,
            difficulty: c.difficulty || 'medium',
            tags: c.tags || [],
            aiGenerated: true,
            front: c.question, // Backwards-compatibility
            back: c.answer,
          },
        }),
      ),
    );

    return createdCards;
  }

  async generateFromSelection(
    userId: string,
    data: {
      text: string;
      noteId?: string;
      notebookId?: string;
      type: 'recall' | 'conceptual' | 'scenario' | 'interview';
      quantity: number;
    },
  ) {
    console.log('[FlashcardsService] generateFromSelection started.');
    console.log(' - text length:', data.text?.length || 0);
    console.log(
      ' - text preview (first 200 chars):',
      data.text?.slice(0, 200) || '',
    );

    if (!data.text || !data.text.trim()) {
      console.error(
        '[FlashcardsService] Generation aborted: Selected text is empty!',
      );
      throw new Error('Cannot generate flashcards from an empty selection.');
    }

    const generated = await this.ai.generateCards(
      userId,
      data.text,
      data.type,
      data.quantity,
    );

    const createdCards = await this.prisma.$transaction(
      generated.map((c) =>
        this.prisma.flashcard.create({
          data: {
            userId,
            noteId: data.noteId || null,
            notebookId: data.notebookId || null,
            question: c.question,
            answer: c.answer,
            hint: c.hint || null,
            explanation: c.explanation || null,
            difficulty: c.difficulty || 'medium',
            tags: c.tags || [],
            aiGenerated: true,
            front: c.question,
            back: c.answer,
          },
        }),
      ),
    );

    return createdCards;
  }

  async generateFromNotebook(
    userId: string,
    notebookId: string,
    type: 'recall' | 'conceptual' | 'scenario' | 'interview',
    quantity: number,
  ) {
    console.log(
      '[FlashcardsService] generateFromNotebook started. notebookId:',
      notebookId,
    );
    const notebook = await this.prisma.notebook.findFirst({
      where: { id: notebookId, userId },
      include: {
        notes: {
          select: { content: true, markdown: true, autoSaveContent: true },
        },
      },
    });
    if (!notebook) throw new NotFoundException('Notebook not found');

    // Aggregate contents of all notebook notes
    const consolidatedContent = notebook.notes
      .map((n) => n.markdown || n.autoSaveContent || n.content || '')
      .filter(Boolean)
      .join('\n\n---\n\n')
      .slice(0, 10000); // limit to protect tokens

    console.log('[FlashcardsService] Consolidated notebook text details:');
    console.log(' - notes count:', notebook.notes.length);
    console.log(' - consolidated text length:', consolidatedContent.length);
    console.log(
      ' - consolidated text preview (first 200 chars):',
      consolidatedContent.slice(0, 200),
    );

    if (!consolidatedContent.trim()) {
      console.error(
        '[FlashcardsService] Generation aborted: Consolidated notebook text is empty!',
      );
      throw new Error('Cannot generate flashcards from an empty notebook.');
    }

    const generated = await this.ai.generateCards(
      userId,
      consolidatedContent,
      type,
      quantity,
    );

    const createdCards = await this.prisma.$transaction(
      generated.map((c) =>
        this.prisma.flashcard.create({
          data: {
            userId,
            notebookId,
            question: c.question,
            answer: c.answer,
            hint: c.hint || null,
            explanation: c.explanation || null,
            difficulty: c.difficulty || 'medium',
            tags: c.tags || [],
            aiGenerated: true,
            front: c.question,
            back: c.answer,
          },
        }),
      ),
    );

    return createdCards;
  }

  // ==========================================
  // DASHBOARD METRICS
  // ==========================================

  async getStats(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cardsCount = await this.prisma.flashcard.count({ where: { userId } });

    // Reviews logged today
    const reviewsToday = await this.prisma.review.count({
      where: {
        flashcard: { userId },
        createdAt: { gte: today },
      },
    });

    // Total review logs for accuracy stats
    const totalReviews = await this.prisma.review.findMany({
      where: { flashcard: { userId } },
      select: { rating: true, createdAt: true },
    });

    const totalReviewsCount = totalReviews.length;
    // rating > 0 means Hard, Good, or Easy (correct response in SM-2)
    const correctReviewsCount = totalReviews.filter((r) => r.rating > 0).length;
    const accuracy =
      totalReviewsCount > 0
        ? Math.round((correctReviewsCount / totalReviewsCount) * 100)
        : 100;

    // Daily Streak Calculation
    let streak = 0;
    const reviewDates = new Set(
      totalReviews.map((r) => {
        const d = new Date(r.createdAt);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      }),
    );

    const currentCheck = new Date(today);
    while (reviewDates.has(currentCheck.getTime())) {
      streak++;
      currentCheck.setDate(currentCheck.getDate() - 1);
    }

    // Weekly reviews projection
    const next7Days: any[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      d.setHours(0, 0, 0, 0);
      next7Days.push({
        date: d,
        timestamp: d.getTime(),
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        count: 0,
      });
    }

    // Query due dates
    const upcomingScheduled = await this.prisma.spacedRepetition.findMany({
      where: { userId },
      select: { nextReview: true },
    });

    upcomingScheduled.forEach((sr) => {
      const scheduledDay = new Date(sr.nextReview);
      scheduledDay.setHours(0, 0, 0, 0);
      const match = next7Days.find(
        (day) => day.timestamp === scheduledDay.getTime(),
      );
      if (match) {
        match.count++;
      }
    });

    // Find weaknesses: tags with most Again responses (rating = 0)
    const cardReviewsMap = await this.prisma.review.findMany({
      where: { flashcard: { userId }, rating: 0 },
      select: { flashcard: { select: { tags: true } } },
    });

    const badTagCounts: Record<string, number> = {};
    cardReviewsMap.forEach((r) => {
      r.flashcard?.tags?.forEach((t) => {
        badTagCounts[t] = (badTagCounts[t] || 0) + 1;
      });
    });

    const weakTopics = Object.entries(badTagCounts)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Total due right now
    const dueList = await this.getDueCards(userId);

    return {
      cardsCount,
      reviewsToday,
      accuracy,
      streak,
      dueCount: dueList.length,
      weakTopics,
      upcomingReviews: next7Days.map((d) => ({
        label: d.label,
        count: d.count,
      })),
    };
  }
}
