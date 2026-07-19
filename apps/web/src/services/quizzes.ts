import api from '@/lib/axios';

export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  userId: string;
  notebookId: string | null;
  noteId: string | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  questionCount: number;
  estimatedTime: number;
  aiGenerated: boolean;
  status: 'DRAFT' | 'PUBLISHED';
  createdAt: string;
  updatedAt: string;
  note?: { id: string; title: string };
  notebook?: { id: string; title: string };
  questions?: Question[];
  attempts?: Attempt[];
}

export interface Question {
  id: string;
  quizId: string;
  type: 'MCQ' | 'TRUE_FALSE';
  question: string;
  explanation: string | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  order: number;
  choices: Choice[];
}

export interface Choice {
  id: string;
  questionId: string;
  text: string;
  isCorrect?: boolean;
}

export interface Attempt {
  id: string;
  quizId: string;
  userId: string;
  startedAt: string;
  completedAt: string | null;
  score: number;
  percentage: number;
  duration: number;
  quiz?: { id: string; title: string; questionCount: number };
  answers?: AttemptAnswer[];
}

export interface AttemptAnswer {
  id: string;
  attemptId: string;
  questionId: string;
  selectedChoiceId: string | null;
  isCorrect: boolean;
  question?: Question;
  selectedChoice?: Choice;
}

class QuizzesService {
  async getQuizzes(): Promise<Quiz[]> {
    const res = await api.get('/quizzes');
    return res.data;
  }

  async getQuiz(id: string): Promise<Quiz> {
    const res = await api.get(`/quizzes/${id}`);
    return res.data;
  }

  async deleteQuiz(id: string): Promise<{ success: boolean }> {
    const res = await api.delete(`/quizzes/${id}`);
    return res.data;
  }

  async generateFromNote(noteId: string, data: { questionCount: number; difficulty: 'EASY' | 'MEDIUM' | 'HARD' }): Promise<Quiz> {
    const res = await api.post(`/quizzes/generate/note/${noteId}`, data);
    return res.data;
  }

  async generateFromNotebook(notebookId: string, data: { questionCount: number; difficulty: 'EASY' | 'MEDIUM' | 'HARD' }): Promise<Quiz> {
    const res = await api.post(`/quizzes/generate/notebook/${notebookId}`, data);
    return res.data;
  }

  async generateFromSelection(text: string, data: { questionCount: number; difficulty: 'EASY' | 'MEDIUM' | 'HARD' }): Promise<Quiz> {
    const res = await api.post(`/quizzes/generate/selection`, { text, ...data });
    return res.data;
  }

  async startAttempt(quizId: string): Promise<Attempt> {
    const res = await api.post(`/quizzes/${quizId}/start`);
    return res.data;
  }

  async submitAttempt(attemptId: string, data: { answers: { questionId: string; selectedChoiceId: string | null }[] }): Promise<Attempt> {
    const res = await api.post(`/quizzes/${attemptId}/submit`, data);
    return res.data;
  }

  async getAttemptsHistory(): Promise<Attempt[]> {
    const res = await api.get('/quizzes/history');
    return res.data;
  }

  async getAttempt(attemptId: string): Promise<Attempt> {
    const res = await api.get(`/quizzes/attempts/${attemptId}`);
    return res.data;
  }
}

const quizzesService = new QuizzesService();
export default quizzesService;
