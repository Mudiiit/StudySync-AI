import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksService, Task, TaskStatus } from '@/services/tasks';

export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: () => tasksService.getWorkspaces(),
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { name: string; description?: string }) =>
      tasksService.createWorkspace(vars.name, vars.description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

export function useProjects(workspaceId: string | null) {
  return useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: () => (workspaceId ? tasksService.getProjects(workspaceId) : []),
    enabled: !!workspaceId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: { workspaceId: string; name: string; description?: string; status?: any; dueDate?: string }) =>
      tasksService.createProject(dto),
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['projects', vars.workspaceId] });
    },
  });
}

export function useTasksList(filters: {
  workspaceId: string | null;
  projectId?: string;
  status?: string;
  priority?: string;
  inTrash?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => (filters.workspaceId ? tasksService.getTasks(filters as any) : { tasks: [], total: 0, totalPages: 0 }),
    enabled: !!filters.workspaceId,
  });
}

export function useTaskDetails(taskId: string | null) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: () => (taskId ? tasksService.getTask(taskId) : null),
    enabled: !!taskId,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: { workspaceId: string; title: string; description?: string; projectId?: string | null; status?: TaskStatus; priority?: any; dueDate?: string }) =>
      tasksService.createTask(dto),
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { taskId: string; dto: Partial<Task> }) =>
      tasksService.updateTask(vars.taskId, vars.dto),
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', vars.taskId] });
    },
  });
}

export function useMoveTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { taskId: string; status: TaskStatus; order: number }) =>
      tasksService.moveTask(vars.taskId, vars.status, vars.order),
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', vars.taskId] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => tasksService.deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { taskId: string; content: string }) =>
      tasksService.addComment(vars.taskId, vars.content),
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['task', vars.taskId] });
    },
  });
}

export function useCreateChecklist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { taskId: string; title: string }) =>
      tasksService.createChecklist(vars.taskId, vars.title),
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['task', vars.taskId] });
    },
  });
}

export function useAddChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { taskId: string; checklistId: string; title: string }) =>
      tasksService.addChecklistItem(vars.taskId, vars.checklistId, vars.title),
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['task', vars.taskId] });
    },
  });
}

export function useToggleChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { taskId: string; itemId: string; isCompleted: boolean }) =>
      tasksService.toggleChecklistItem(vars.taskId, vars.itemId, vars.isCompleted),
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['task', vars.taskId] });
    },
  });
}

export function useAddDependency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { taskId: string; dependsOnId: string }) =>
      tasksService.addDependency(vars.taskId, vars.dependsOnId),
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['task', vars.taskId] });
    },
  });
}

export function useRemoveDependency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { taskId: string; dependsOnId: string }) =>
      tasksService.removeDependency(vars.taskId, vars.dependsOnId),
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['task', vars.taskId] });
    },
  });
}

export function useAiBreakdown() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => tasksService.triggerAiBreakdown(taskId),
    onSuccess: (data, taskId) => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });
}

export function useTasksAnalytics(workspaceId: string | null) {
  return useQuery({
    queryKey: ['tasks-analytics', workspaceId],
    queryFn: () => (workspaceId ? tasksService.getAnalytics(workspaceId) : null),
    enabled: !!workspaceId,
  });
}
