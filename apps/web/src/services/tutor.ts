import api from '@/lib/axios';

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
  _count?: {
    messages: number;
  };
}

export const tutorService = {
  async listConversations(): Promise<ChatConversation[]> {
    const res = await api.get('/tutor/conversations');
    return res.data;
  },

  async createConversation(title?: string): Promise<ChatConversation> {
    const res = await api.post('/tutor/conversations', { title });
    return res.data;
  },

  async getConversationDetails(id: string): Promise<ChatConversation> {
    const res = await api.get(`/tutor/conversations/${id}`);
    return res.data;
  },

  async deleteConversation(id: string): Promise<{ success: boolean }> {
    const res = await api.delete(`/tutor/conversations/${id}`);
    return res.data;
  },

  async renameConversation(id: string, title: string): Promise<ChatConversation> {
    const res = await api.patch(`/tutor/conversations/${id}`, { title });
    return res.data;
  },
};


export default tutorService;
