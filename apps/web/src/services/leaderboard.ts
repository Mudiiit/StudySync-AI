import api from '@/lib/axios';

export interface LeaderboardUser {
  rank: number;
  previousRank: number;
  rankChange: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  level: number;
  xp: number;
  studyHours: number;
  streak: number;
  achievementsCount: number;
  quizAccuracy: number;
}

export interface LeaderboardResponse {
  list: LeaderboardUser[];
  currentUser: LeaderboardUser | null;
  countdownSeconds: number;
}

export interface ChampionRecord {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string;
  type: 'WEEKLY' | 'MONTHLY';
  period: string;
  xp: number;
  studyHours: number;
  rank: number;
  createdAt: string;
}

const leaderboardService = {
  getWeekly: async (): Promise<LeaderboardResponse> => {
    const res = await api.get('/leaderboard/weekly');
    return res.data;
  },

  getMonthly: async (): Promise<LeaderboardResponse> => {
    const res = await api.get('/leaderboard/monthly');
    return res.data;
  },

  getFriends: async (period: 'weekly' | 'monthly' | 'alltime'): Promise<LeaderboardUser[]> => {
    const res = await api.get(`/leaderboard/friends?period=${period}`);
    return res.data;
  },

  getSubject: async (subject: string): Promise<LeaderboardUser[]> => {
    const res = await api.get(`/leaderboard/subject/${encodeURIComponent(subject)}`);
    return res.data;
  },

  getChampions: async (): Promise<ChampionRecord[]> => {
    const res = await api.get('/leaderboard/champions');
    return res.data;
  },

  recalculate: async (): Promise<void> => {
    await api.post('/leaderboard/recalculate');
  },

  resetWeekly: async (): Promise<void> => {
    await api.post('/leaderboard/reset/weekly');
  },

  resetMonthly: async (): Promise<void> => {
    await api.post('/leaderboard/reset/monthly');
  }
};

export default leaderboardService;
