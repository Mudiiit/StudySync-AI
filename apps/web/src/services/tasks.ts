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
};
export default tasksService;
