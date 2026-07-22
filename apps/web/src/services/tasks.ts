import api from '@/lib/axios';
import { TaskStatus, TaskPriority, ProjectStatus } from '@studysync/database';

export { TaskStatus, TaskPriority, ProjectStatus };

export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  dueDate: string | null;
  createdAt: string;
}

export interface TaskComment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    profile: {
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
    };
  };
}

export interface TaskAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  isCompleted: boolean;
  order: number;
}

export interface Checklist {
  id: string;
  title: string;
  items: ChecklistItem[];
}

export interface Dependency {
  taskId: string;
  dependsOnId: string;
  dependsOn: {
    id: string;
    title: string;
    status: TaskStatus;
  };
}

export interface Task {
  id: string;
  workspaceId: string;
  projectId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  isCompleted: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
  project?: { name: string };
  comments?: TaskComment[];
  attachments?: TaskAttachment[];
  checklists?: Checklist[];
  dependencies?: Dependency[];
}

export const tasksService = {
  // Workspaces
  async getWorkspaces(): Promise<Workspace[]> {
    const res = await api.get('/tasks/workspaces');
    return res.data;
  },

  async createWorkspace(name: string, description?: string): Promise<Workspace> {
    const res = await api.post('/tasks/workspaces', { name, description });
    return res.data;
  },

  // Projects
  async getProjects(workspaceId: string): Promise<Project[]> {
    const res = await api.get('/tasks/projects', { params: { workspaceId } });
    return res.data;
  },

  async createProject(dto: { workspaceId: string; name: string; description?: string; status?: ProjectStatus; dueDate?: string }): Promise<Project> {
    const res = await api.post('/tasks/projects', dto);
    return res.data;
  },

  // Tasks
  async getTasks(filters: {
    workspaceId: string;
    projectId?: string;
    status?: string;
    priority?: string;
    inTrash?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ tasks: Task[]; total: number; totalPages: number }> {
    const res = await api.get('/tasks', { params: filters });
    return res.data;
  },

  async getTask(taskId: string): Promise<Task> {
    const res = await api.get(`/tasks/${taskId}`);
    return res.data;
  },

  async createTask(dto: { workspaceId: string; title: string; description?: string; projectId?: string | null; status?: TaskStatus; priority?: TaskPriority; dueDate?: string }): Promise<Task> {
    const res = await api.post('/tasks', dto);
    return res.data;
  },

  async updateTask(taskId: string, dto: Partial<Task>): Promise<Task> {
    const res = await api.patch(`/tasks/${taskId}`, dto);
    return res.data;
  },

  async moveTask(taskId: string, status: TaskStatus, order: number): Promise<Task> {
    const res = await api.post(`/tasks/${taskId}/move`, { status, order });
    return res.data;
  },

  async deleteTask(taskId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}`);
  },

  // Comments
  async addComment(taskId: string, content: string): Promise<TaskComment> {
    const res = await api.post(`/tasks/${taskId}/comments`, { content });
    return res.data;
  },

  // Checklists
  async createChecklist(taskId: string, title: string): Promise<Checklist> {
    const res = await api.post(`/tasks/${taskId}/checklist`, { title });
    return res.data;
  },

  async addChecklistItem(taskId: string, checklistId: string, title: string): Promise<ChecklistItem> {
    const res = await api.post(`/tasks/${taskId}/checklist/${checklistId}/item`, { title });
    return res.data;
  },

  async toggleChecklistItem(taskId: string, itemId: string, isCompleted: boolean): Promise<ChecklistItem> {
    const res = await api.patch(`/tasks/${taskId}/checklist-item/${itemId}`, { isCompleted });
    return res.data;
  },

  // Dependencies
  async addDependency(taskId: string, dependsOnId: string): Promise<void> {
    await api.post(`/tasks/${taskId}/dependencies`, { dependsOnId });
  },

  async removeDependency(taskId: string, dependsOnId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}/dependencies/${dependsOnId}`);
  },

  // AI Breakdown
  async triggerAiBreakdown(taskId: string): Promise<Checklist & { items: ChecklistItem[] }> {
    const res = await api.post(`/tasks/${taskId}/ai-breakdown`);
    return res.data;
  },

  // Analytics
  async getAnalytics(workspaceId: string): Promise<any> {
    const res = await api.get('/tasks/analytics', { params: { workspaceId } });
    return res.data;
  },

  async getBurnupChart(workspaceId: string): Promise<any[]> {
    const res = await api.get('/tasks/analytics/burnup', { params: { workspaceId } });
    return res.data;
  },

  // Sprints & Epics
  async getSprints(workspaceId: string): Promise<any[]> {
    const res = await api.get('/tasks/sprints', { params: { workspaceId } });
    return res.data;
  },

  async createSprint(workspaceId: string, name: string, startDate: string, endDate: string, goal?: string): Promise<any> {
    const res = await api.post('/tasks/sprints', { workspaceId, name, startDate, endDate, goal });
    return res.data;
  },

  async getEpics(workspaceId: string): Promise<any[]> {
    const res = await api.get('/tasks/epics', { params: { workspaceId } });
    return res.data;
  },

  async createEpic(workspaceId: string, name: string, description?: string, color?: string): Promise<any> {
    const res = await api.post('/tasks/epics', { workspaceId, name, description, color });
    return res.data;
  },

  // Dependency Graph & Checks
  async getDependencyGraph(workspaceId: string): Promise<{ nodes: any[]; edges: any[] }> {
    const res = await api.get('/tasks/dependency-graph', { params: { workspaceId } });
    return res.data;
  },

  async checkPrerequisites(taskId: string): Promise<{ hasUnmetDependencies: boolean; unmetPrerequisites: any[] }> {
    const res = await api.get(`/tasks/${taskId}/dependency-check`);
    return res.data;
  },

  // AI Task Generation
  async generateTasksFromAi(dto: { workspaceId: string; projectId?: string; sourceType?: string; sourceText?: string }): Promise<any[]> {
    const res = await api.post('/tasks/ai/generate', dto);
    return res.data;
  },

  // AI Time Estimation
  async estimateDuration(taskId: string): Promise<number> {
    const res = await api.post(`/tasks/${taskId}/estimate`);
    return res.data;
  },

  // Time Logs
  async addTimeLog(taskId: string, durationMins: number, notes?: string): Promise<any> {
    const res = await api.post(`/tasks/${taskId}/timelog`, { taskId, durationMins, notes });
    return res.data;
  },

  async getTimeLogs(taskId: string): Promise<any[]> {
    const res = await api.get(`/tasks/${taskId}/timelogs`);
    return res.data;
  },

  // Focus Context
  async getFocusContext(taskId: string): Promise<any> {
    const res = await api.get(`/tasks/${taskId}/focus-context`);
    return res.data;
  },

  // Overload Check
  async detectOverload(workspaceId: string): Promise<{ isOverloaded: boolean; message?: string }> {
    const res = await api.get('/tasks/overload-check', { params: { workspaceId } });
    return res.data;
  },
};
export default tasksService;
