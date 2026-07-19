import api from '@/lib/axios';

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  responses?: any[];
}

export interface ChatConversation {
  id: string;
  userId: string;
  title: string;
  model?: string;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
  _count?: {
    messages: number;
  };
}

export const tutorService = {
  async listConversations(): Promise<ChatConversation[]> {
    const res = await api.get('/tutor/history');
    return res.data;
  },

  async createConversation(title?: string): Promise<ChatConversation> {
    // If the API requires post to history, we can implement it
    const res = await api.post('/tutor/chat', { prompt: 'Initialize conversation', title });
    return res.data;
  },

  async getConversationDetails(id: string): Promise<ChatConversation> {
    const res = await api.get(`/tutor/history/${id}`);
    return res.data;
  },

  async deleteConversation(id: string): Promise<{ success: boolean }> {
    const res = await api.delete(`/tutor/history/${id}`);
    return res.data;
  },

  async renameConversation(id: string, title: string): Promise<ChatConversation> {
    const res = await api.patch(`/tutor/history/${id}`, { title });
    return res.data;
  },

  async stopGeneration(conversationId: string): Promise<{ success: boolean }> {
    const res = await api.post('/tutor/stop', { conversationId });
    return res.data;
  },

  async regenerateResponse(conversationId: string): Promise<any> {
    const res = await api.post('/tutor/regenerate', { conversationId });
    return res.data;
  },
};

export default tutorService;
