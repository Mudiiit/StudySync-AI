import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import flashcardsService from '@/services/flashcards';

export function useFlashcardsList(filters: {
  search?: string;
  notebookId?: string;
  noteId?: string;
  difficulty?: string;
  aiGenerated?: boolean;
  isFavorite?: boolean;
  tag?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['flashcards', filters],
    queryFn: () => flashcardsService.getFlashcards(filters),
  });
}

export function useDueCards() {
  return useQuery({
    queryKey: ['flashcards', 'due'],
    queryFn: () => flashcardsService.getDueCards(),
  });
}

export function useFlashcardStats() {
  return useQuery({
    queryKey: ['flashcards', 'stats'],
    queryFn: () => flashcardsService.getStats(),
  });
}

export function useCreateFlashcard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      question: string;
      answer: string;
      hint?: string;
      explanation?: string;
      difficulty?: string;
      tags?: string[];
      noteId?: string;
      notebookId?: string;
    }) => flashcardsService.createFlashcard(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
    },
  });
}

export function useUpdateFlashcard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      id: string;
      data: {
        question?: string;
        answer?: string;
        hint?: string;
        explanation?: string;
        difficulty?: string;
        tags?: string[];
        isFavorite?: boolean;
      };
    }) => flashcardsService.updateFlashcard(vars.id, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
    },
  });
}

export function useDeleteFlashcard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => flashcardsService.deleteFlashcard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
    },
  });
}

export function useReviewCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { cardId: string; rating: number }) =>
      flashcardsService.reviewCard(vars.cardId, vars.rating),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
      queryClient.invalidateQueries({ queryKey: ['flashcards', 'due'] });
      queryClient.invalidateQueries({ queryKey: ['flashcards', 'stats'] });
    },
  });
}

export function useGenerateFlashcardsFromNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      noteId: string;
      type: 'recall' | 'conceptual' | 'scenario' | 'interview';
      quantity: number;
    }) => flashcardsService.generateFromNote(vars.noteId, vars.type, vars.quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
      queryClient.invalidateQueries({ queryKey: ['flashcards', 'due'] });
      queryClient.invalidateQueries({ queryKey: ['flashcards', 'stats'] });
    },
  });
}

export function useGenerateFlashcardsFromSelection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      text: string;
      noteId?: string;
      notebookId?: string;
      type: 'recall' | 'conceptual' | 'scenario' | 'interview';
      quantity: number;
    }) => flashcardsService.generateFromSelection(vars),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
      queryClient.invalidateQueries({ queryKey: ['flashcards', 'due'] });
      queryClient.invalidateQueries({ queryKey: ['flashcards', 'stats'] });
    },
  });
}

export function useGenerateFlashcardsFromNotebook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      notebookId: string;
      type: 'recall' | 'conceptual' | 'scenario' | 'interview';
      quantity: number;
    }) => flashcardsService.generateFromNotebook(vars.notebookId, vars.type, vars.quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
      queryClient.invalidateQueries({ queryKey: ['flashcards', 'due'] });
      queryClient.invalidateQueries({ queryKey: ['flashcards', 'stats'] });
    },
  });
}
