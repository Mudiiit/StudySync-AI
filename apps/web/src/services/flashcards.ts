import api from '@/lib/axios';

export interface SpacedRepetition {
  id: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReview: string;
  createdAt: string;
  updatedAt: string;
}

export interface Flashcard {
  id: string;
  userId: string;
  deckId: string | null;
  noteId: string | null;
  notebookId: string | null;
  front: string | null;
  back: string | null;
  question: string;
  answer: string;
  hint: string | null;
  explanation: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  aiGenerated: boolean;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  note?: { title: string };
  notebook?: { title: string };
  spacedRep?: SpacedRepetition[];
}

export interface ReviewLog {
  id: string;
  flashcardId: string;
  rating: number;
  interval: number;
  repetitions: number;
  easeFactor: number;
  nextReview: string;
  lastReviewed: string;
  createdAt: string;
}

export interface FlashcardStats {
  cardsCount: number;
  reviewsToday: number;
  accuracy: number;
  streak: number;
  dueCount: number;
  weakTopics: { topic: string; count: number }[];
  upcomingReviews: { label: string; count: number }[];
}

export interface FlashcardsListResponse {
  items: Flashcard[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class FlashcardsService {
  async getFlashcards(params?: {
    search?: string;
    notebookId?: string;
    noteId?: string;
    difficulty?: string;
    aiGenerated?: boolean;
    isFavorite?: boolean;
    tag?: string;
    page?: number;
    limit?: number;
  }): Promise<FlashcardsListResponse> {
    const res = await api.get('/flashcards', { params });
    return res.data;
  }

  async getDueCards(): Promise<Flashcard[]> {
    const res = await api.get('/flashcards/due');
    return res.data;
  }

  async reviewCard(
    cardId: string,
    rating: number,
  ): Promise<{
    success: boolean;
    nextReview: string;
    intervalDays: number;
    spacedRep: SpacedRepetition;
    reviewLog: ReviewLog;
  }> {
    const res = await api.post(`/flashcards/${cardId}/review`, { rating });
    return res.data;
  }

  async getStats(): Promise<FlashcardStats> {
    const res = await api.get('/flashcards/stats');
    return res.data;
  }

  async createFlashcard(data: {
    question: string;
    answer: string;
    hint?: string;
    explanation?: string;
    difficulty?: string;
    tags?: string[];
    noteId?: string;
    notebookId?: string;
  }): Promise<Flashcard> {
    const res = await api.post('/flashcards', data);
    return res.data;
  }

  async updateFlashcard(
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
  ): Promise<Flashcard> {
    const res = await api.patch(`/flashcards/${id}`, data);
    return res.data;
  }

  async deleteFlashcard(id: string): Promise<any> {
    const res = await api.delete(`/flashcards/${id}`);
    return res.data;
  }

  async generateFromNote(
    noteId: string,
    type: 'recall' | 'conceptual' | 'scenario' | 'interview',
    quantity: number,
  ): Promise<Flashcard[]> {
    const res = await api.post(`/flashcards/generate/note/${noteId}`, { type, quantity });
    return res.data;
  }

  async generateFromSelection(dto: {
    text: string;
    noteId?: string;
    notebookId?: string;
    type: 'recall' | 'conceptual' | 'scenario' | 'interview';
    quantity: number;
  }): Promise<Flashcard[]> {
    const res = await api.post('/flashcards/generate/selection', dto);
    return res.data;
  }

  async generateFromNotebook(
    notebookId: string,
    type: 'recall' | 'conceptual' | 'scenario' | 'interview',
    quantity: number,
  ): Promise<Flashcard[]> {
    const res = await api.post(`/flashcards/generate/notebook/${notebookId}`, { type, quantity });
    return res.data;
  }
}

const flashcardsService = new FlashcardsService();
export default flashcardsService;
