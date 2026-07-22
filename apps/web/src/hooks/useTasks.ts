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

export function useBurnupChart(workspaceId: string | null) {
  return useQuery({
    queryKey: ['tasks-burnup', workspaceId],
    queryFn: () => (workspaceId ? tasksService.getBurnupChart(workspaceId) : []),
    enabled: !!workspaceId,
  });
}

export function useSprints(workspaceId: string | null) {
  return useQuery({
    queryKey: ['sprints', workspaceId],
    queryFn: () => (workspaceId ? tasksService.getSprints(workspaceId) : []),
    enabled: !!workspaceId,
  });
}

export function useCreateSprint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { workspaceId: string; name: string; startDate: string; endDate: string; goal?: string }) =>
      tasksService.createSprint(vars.workspaceId, vars.name, vars.startDate, vars.endDate, vars.goal),
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['sprints', vars.workspaceId] });
    },
  });
}

export function useEpics(workspaceId: string | null) {
  return useQuery({
    queryKey: ['epics', workspaceId],
    queryFn: () => (workspaceId ? tasksService.getEpics(workspaceId) : []),
    enabled: !!workspaceId,
  });
}

export function useCreateEpic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { workspaceId: string; name: string; description?: string; color?: string }) =>
      tasksService.createEpic(vars.workspaceId, vars.name, vars.description, vars.color),
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['epics', vars.workspaceId] });
    },
  });
}

export function useDependencyGraph(workspaceId: string | null) {
  return useQuery({
    queryKey: ['dependency-graph', workspaceId],
    queryFn: () => (workspaceId ? tasksService.getDependencyGraph(workspaceId) : { nodes: [], edges: [] }),
    enabled: !!workspaceId,
  });
}

export function useCheckPrerequisites(taskId: string | null) {
  return useQuery({
    queryKey: ['prerequisites-check', taskId],
    queryFn: () => (taskId ? tasksService.checkPrerequisites(taskId) : null),
    enabled: !!taskId,
  });
}

export function useGenerateTasksFromAi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: { workspaceId: string; projectId?: string; sourceType?: string; sourceText?: string }) =>
      tasksService.generateTasksFromAi(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useEstimateDuration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => tasksService.estimateDuration(taskId),
    onSuccess: (data, taskId) => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useAddTimeLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { taskId: string; durationMins: number; notes?: string }) =>
      tasksService.addTimeLog(vars.taskId, vars.durationMins, vars.notes),
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['timelogs', vars.taskId] });
      queryClient.invalidateQueries({ queryKey: ['task', vars.taskId] });
    },
  });
}

export function useTimeLogs(taskId: string | null) {
  return useQuery({
    queryKey: ['timelogs', taskId],
    queryFn: () => (taskId ? tasksService.getTimeLogs(taskId) : []),
    enabled: !!taskId,
  });
}

export function useFocusContext(taskId: string | null) {
  return useQuery({
    queryKey: ['focus-context', taskId],
    queryFn: () => (taskId ? tasksService.getFocusContext(taskId) : null),
    enabled: !!taskId,
  });
}

export function useDetectOverload(workspaceId: string | null) {
  return useQuery({
    queryKey: ['detect-overload', workspaceId],
    queryFn: () => (workspaceId ? tasksService.detectOverload(workspaceId) : null),
    enabled: !!workspaceId,
  });
}
