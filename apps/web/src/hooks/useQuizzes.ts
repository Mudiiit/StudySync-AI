import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import quizzesService from '@/services/quizzes';

export function useQuizzesList() {
  return useQuery({
    queryKey: ['quizzes'],
    queryFn: () => quizzesService.getQuizzes(),
  });
}

export function useQuiz(id: string) {
  return useQuery({
    queryKey: ['quizzes', id],
    queryFn: () => quizzesService.getQuiz(id),
    enabled: !!id,
  });
}

export function useDeleteQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => quizzesService.deleteQuiz(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
  });
}

export function useGenerateQuizFromNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { noteId: string; data: { questionCount: number; difficulty: 'EASY' | 'MEDIUM' | 'HARD' } }) =>
      quizzesService.generateFromNote(vars.noteId, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
  });
}

export function useGenerateQuizFromNotebook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { notebookId: string; data: { questionCount: number; difficulty: 'EASY' | 'MEDIUM' | 'HARD' } }) =>
      quizzesService.generateFromNotebook(vars.notebookId, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
  });
}

export function useGenerateQuizFromSelection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { text: string; data: { questionCount: number; difficulty: 'EASY' | 'MEDIUM' | 'HARD' } }) =>
      quizzesService.generateFromSelection(vars.text, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
  });
}

export function useStartQuizAttempt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quizId: string) => quizzesService.startAttempt(quizId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes', 'history'] });
    },
  });
}

export function useSubmitQuizAttempt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { attemptId: string; data: { answers: { questionId: string; selectedChoiceId: string | null }[] } }) =>
      quizzesService.submitAttempt(vars.attemptId, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes', 'history'] });
    },
  });
}

export function useAttemptsHistory() {
  return useQuery({
    queryKey: ['quizzes', 'history'],
    queryFn: () => quizzesService.getAttemptsHistory(),
  });
}

export function useQuizAttempt(attemptId: string) {
  return useQuery({
    queryKey: ['quizzes', 'attempt', attemptId],
    queryFn: () => quizzesService.getAttempt(attemptId),
    enabled: !!attemptId,
  });
}
