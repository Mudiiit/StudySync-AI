import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notesService, Note } from '@/services/notes';

export function useFolders() {
  return useQuery({
    queryKey: ['folders'],
    queryFn: () => notesService.getFolders(),
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { name: string; parentId: string | null }) =>
      notesService.createFolder(vars.name, vars.parentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (folderId: string) => notesService.deleteFolder(folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useNotesList(filters: {
  folderId?: string;
  notebookId?: string;
  isPinned?: boolean;
  isFavorite?: boolean;
  favorite?: boolean;
  archived?: boolean;
  deleted?: boolean;
  inTrash?: boolean;
  tag?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  return useQuery({
    queryKey: ['notes', filters],
    queryFn: () => notesService.getNotes(filters),
  });
}

export function useNoteDetails(noteId: string | null) {
  return useQuery({
    queryKey: ['note', noteId],
    queryFn: () => (noteId ? notesService.getNote(noteId) : null),
    enabled: !!noteId,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: {
      title: string;
      content: string;
      markdown?: string;
      folderId?: string | null;
      notebookId?: string | null;
      favorite?: boolean;
      archived?: boolean;
      deleted?: boolean;
      tags?: string[];
    }) => notesService.createNote(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { noteId: string; dto: Partial<Note> }) => {
      console.log('[useUpdateNote Hook] Executing mutation with:', vars);
      return notesService.updateNote(vars.noteId, vars.dto);
    },
    onMutate: async (newVars) => {
      // 1. Cancel details query refetches
      await queryClient.cancelQueries({ queryKey: ['note', newVars.noteId] });
      await queryClient.cancelQueries({ queryKey: ['notes'] });

      // 2. Snapshot current values
      const previousNote = queryClient.getQueryData<Note>(['note', newVars.noteId]);
      
      const previousLists: [any, any][] = [];
      const queries = queryClient.getQueryCache().findAll({ queryKey: ['notes'] });
      queries.forEach(query => {
        previousLists.push([query.queryKey, queryClient.getQueryData(query.queryKey)]);
      });

      // 3. Optimistically update details query cache
      if (previousNote) {
        let optimisticNote = { ...previousNote, ...newVars.dto };
        if (newVars.dto.tags !== undefined) {
          optimisticNote.tags = (newVars.dto.tags as any).map((tagName: string) => ({
            noteId: newVars.noteId,
            tagId: tagName,
            tag: { id: tagName, name: tagName }
          }));
        }
        queryClient.setQueryData(['note', newVars.noteId], optimisticNote);
      }

      // 4. Optimistically update list queries cache
      queries.forEach(query => {
        const queryKey = query.queryKey;
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old) return old;
          
          if (Array.isArray(old)) {
            return old.map((n: any) => {
              if (n.id === newVars.noteId) {
                let updated = { ...n, ...newVars.dto };
                if (newVars.dto.tags !== undefined) {
                  updated.tags = (newVars.dto.tags as any).map((tagName: string) => ({
                    noteId: newVars.noteId,
                    tagId: tagName,
                    tag: { id: tagName, name: tagName }
                  }));
                }
                return updated;
              }
              return n;
            });
          }
          
          if (old.notes && Array.isArray(old.notes)) {
            return {
              ...old,
              notes: old.notes.map((n: any) => {
                if (n.id === newVars.noteId) {
                  let updated = { ...n, ...newVars.dto };
                  if (newVars.dto.tags !== undefined) {
                    updated.tags = (newVars.dto.tags as any).map((tagName: string) => ({
                      noteId: newVars.noteId,
                      tagId: tagName,
                      tag: { id: tagName, name: tagName }
                    }));
                  }
                  return updated;
                }
                return n;
              })
            };
          }
          
          return old;
        });
      });

      return { previousNote, previousLists };
    },
    onError: (err, newVars, context: any) => {
      if (context?.previousNote) {
        queryClient.setQueryData(['note', newVars.noteId], context.previousNote);
      }
      if (context?.previousLists) {
        context.previousLists.forEach(([key, val]: any) => {
          queryClient.setQueryData(key, val);
        });
      }
    },
    onSuccess: (data, vars) => {
      console.log('[useUpdateNote Hook] Mutation success. Invalidation starting. Invaliding notes, note:', vars.noteId);
      queryClient.setQueryData(['note', vars.noteId], data);
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['note', vars.noteId] });
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
    },
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => notesService.toggleFavorite(noteId),
    onSuccess: (data, noteId) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['note', noteId] });
    },
  });
}

export function useToggleArchive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => notesService.toggleArchive(noteId),
    onSuccess: (data, noteId) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['note', noteId] });
    },
  });
}

export function useToggleSoftDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => notesService.toggleSoftDelete(noteId),
    onSuccess: (data, noteId) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['note', noteId] });
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
    },
  });
}

export function useNotebooks() {
  return useQuery({
    queryKey: ['notebooks'],
    queryFn: () => notesService.getNotebooks(),
  });
}

export function useCreateNotebook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: { title: string; color: string; icon: string; description?: string }) =>
      notesService.createNotebook(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
    },
  });
}

export function useUpdateNotebook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { notebookId: string; dto: { title?: string; color?: string; icon?: string; description?: string } }) =>
      notesService.updateNotebook(vars.notebookId, vars.dto),
    onMutate: async (newVars) => {
      await queryClient.cancelQueries({ queryKey: ['notebooks'] });
      const previousNotebooks = queryClient.getQueryData<any[]>(['notebooks']);
      if (previousNotebooks) {
        queryClient.setQueryData(
          ['notebooks'],
          previousNotebooks.map((n) =>
            n.id === newVars.notebookId ? { ...n, ...newVars.dto } : n
          )
        );
      }
      return { previousNotebooks };
    },
    onError: (err, newVars, context: any) => {
      if (context?.previousNotebooks) {
        queryClient.setQueryData(['notebooks'], context.previousNotebooks);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
    },
  });
}

export function useDeleteNotebook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notebookId: string) => notesService.deleteNotebook(notebookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useRestoreVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { noteId: string; versionId: string }) =>
      notesService.restoreVersion(vars.noteId, vars.versionId),
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['note', vars.noteId] });
      queryClient.invalidateQueries({ queryKey: ['versions', vars.noteId] });
    },
  });
}
