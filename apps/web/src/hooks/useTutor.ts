import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import tutorService from '@/services/tutor';

export function useTutorConversations() {
  return useQuery({
    queryKey: ['tutor', 'conversations'],
    queryFn: () => tutorService.listConversations(),
  });
}

export function useTutorDetails(conversationId: string | null) {
  return useQuery({
    queryKey: ['tutor', 'conversations', conversationId],
    queryFn: () => tutorService.getConversationDetails(conversationId!),
    enabled: !!conversationId,
  });
}

export function useCreateTutorChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title?: string) => tutorService.createConversation(title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutor', 'conversations'] });
    },
  });
}

export function useDeleteTutorChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tutorService.deleteConversation(id),
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: ['tutor', 'conversations'] });
      queryClient.removeQueries({ queryKey: ['tutor', 'conversations', conversationId] });
    },
  });
}

export function useRenameTutorChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; title: string }) =>
      tutorService.renameConversation(vars.id, vars.title),
    onMutate: async ({ id, title }) => {
      await queryClient.cancelQueries({ queryKey: ['tutor', 'conversations'] });
      await queryClient.cancelQueries({ queryKey: ['tutor', 'conversations', id] });

      const previousConversations = queryClient.getQueryData<any[]>(['tutor', 'conversations']);
      const previousDetails = queryClient.getQueryData<any>(['tutor', 'conversations', id]);

      if (previousConversations) {
        queryClient.setQueryData(
          ['tutor', 'conversations'],
          previousConversations.map((c) => (c.id === id ? { ...c, title } : c))
        );
      }

      if (previousDetails) {
        queryClient.setQueryData(['tutor', 'conversations', id], {
          ...previousDetails,
          title,
        });
      }

      return { previousConversations, previousDetails, id };
    },
    onError: (err, variables, context) => {
      if (context?.previousConversations) {
        queryClient.setQueryData(['tutor', 'conversations'], context.previousConversations);
      }
      if (context?.previousDetails && context?.id) {
        queryClient.setQueryData(['tutor', 'conversations', context.id], context.previousDetails);
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tutor', 'conversations'] });
      queryClient.invalidateQueries({ queryKey: ['tutor', 'conversations', variables.id] });
    },
  });
}

