import api from '@/lib/axios';

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  children?: Folder[];
}

export interface Notebook {
  id: string;
  userId: string;
  title: string;
  color: string;
  icon: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    notes: number;
  };
}

export interface NoteStats {
  wordCount: number;
  readingTime: number;
  characterCount: number;
}

export interface NoteVersion {
  id: string;
  createdAt: string;
  updatedBy: {
    profile: {
      firstName: string;
      lastName: string;
    };
  };
}

export interface Note {
  id: string;
  title: string;
  content: string;
  autoSaveContent: string | null;
  markdown: string | null;
  summary: string | null;
  folderId: string | null;
  notebookId: string | null;
  isShared: boolean;
  isPinned: boolean;
  isFavorite: boolean;
  favorite: boolean;
  archived: boolean;
  deleted: boolean;
  inTrash: boolean;
  wordCount: number;
  readingTime: number;
  aiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
  notebook?: Notebook;
  tags?: { tag: { id: string; name: string } }[];
  versions?: NoteVersion[];
  stats?: NoteStats;
}

export const notesService = {
  // Notebooks API
  async getNotebooks(): Promise<Notebook[]> {
    const res = await api.get('/notebooks');
    return res.data;
  },

  async createNotebook(dto: { title: string; color: string; icon: string; description?: string }): Promise<Notebook> {
    const res = await api.post('/notebooks', dto);
    return res.data;
  },

  async updateNotebook(notebookId: string, dto: { title?: string; color?: string; icon?: string; description?: string }): Promise<Notebook> {
    const res = await api.patch(`/notebooks/${notebookId}`, dto);
    return res.data;
  },

  async deleteNotebook(notebookId: string): Promise<void> {
    await api.delete(`/notebooks/${notebookId}`);
  },

  // Folders API
  async getFolders(): Promise<Folder[]> {
    const res = await api.get('/notes/folders');
    return res.data;
  },

  async createFolder(name: string, parentId: string | null = null): Promise<Folder> {
    const res = await api.post('/notes/folders', { name, parentId });
    return res.data;
  },

  async deleteFolder(folderId: string): Promise<void> {
    await api.delete(`/notes/folders/${folderId}`);
  },

  // Notes API
  async getNotes(filters: {
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
  }): Promise<{ notes: Note[]; total: number; totalPages: number }> {
    const res = await api.get('/notes', { params: filters });
    return res.data;
  },

  async getNote(noteId: string): Promise<Note> {
    const res = await api.get(`/notes/${noteId}`);
    return res.data;
  },

  async createNote(dto: {
    title: string;
    content: string;
    markdown?: string;
    folderId?: string | null;
    notebookId?: string | null;
    favorite?: boolean;
    archived?: boolean;
    deleted?: boolean;
    tags?: string[];
  }): Promise<Note> {
    const res = await api.post('/notes', dto);
    return res.data;
  },

  async updateNote(noteId: string, dto: Partial<Note>): Promise<Note> {
    const res = await api.patch(`/notes/${noteId}`, dto);
    return res.data;
  },

  async toggleFavorite(noteId: string): Promise<Note> {
    const res = await api.post(`/notes/${noteId}/favorite`);
    return res.data;
  },

  async toggleArchive(noteId: string): Promise<Note> {
    const res = await api.post(`/notes/${noteId}/archive`);
    return res.data;
  },

  async toggleSoftDelete(noteId: string): Promise<Note> {
    const res = await api.post(`/notes/${noteId}/trash`);
    return res.data;
  },

  async autoSave(noteId: string, content: string): Promise<void> {
    await api.post(`/notes/${noteId}/autosave`, { content });
  },

  async getVersions(noteId: string): Promise<NoteVersion[]> {
    const res = await api.get(`/notes/${noteId}/versions`);
    return res.data;
  },

  async restoreVersion(noteId: string, versionId: string): Promise<Note> {
    const res = await api.post(`/notes/${noteId}/versions/${versionId}/restore`);
    return res.data;
  },

  async processAiAction(noteId: string, action: string, language?: string): Promise<{ result: string }> {
    console.log('[notesService] processAiAction request start. noteId:', noteId, 'action:', action);
    try {
      const res = await api.post(`/notes/${noteId}/ai`, { action, language });
      console.log('[notesService] processAiAction request success. status:', res.status, 'data:', res.data);
      return res.data;
    } catch (err) {
      console.error('[notesService] processAiAction request failed:', err);
      throw err;
    }
  },
};
export default notesService;
