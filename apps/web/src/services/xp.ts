import api from '@/lib/axios';

export interface XpLog {
  id: string;
  userId: string;
  amount: number;
  source: string;
  description: string;
  createdAt: string;
}

export interface XpStatistics {
  dailyXp: number;
  weeklyXp: number;
  monthlyXp: number;
  lifetimeXp: number;
  averageXpPerDay: number;
  highestXpDay: number;
}

export interface LevelUpAlert {
  level: number;
  title: string;
  xp: number;
}

class XpService {
  async getXpTimeline(): Promise<XpLog[]> {
    const res = await api.get('/xp/timeline');
    return res.data;
  }

  async getXpStatistics(): Promise<XpStatistics> {
    const res = await api.get('/xp/statistics');
    return res.data;
  }

  async getLevelUpAlert(): Promise<LevelUpAlert | null> {
    const res = await api.get('/xp/level-up');
    return res.data;
  }

  async acknowledgeLevelUp(): Promise<{ success: boolean }> {
    const res = await api.post('/xp/level-up/acknowledge');
    return res.data;
  }

  getXpRangeForLevel(level: number) {
    const currentThreshold = level === 1 ? 0 : 25 * (level - 1) * (level + 2);
    const nextThreshold = 25 * level * (level + 3);
    return {
      currentThreshold,
      nextThreshold,
      width: nextThreshold - currentThreshold,
    };
  }
}

const xpService = new XpService();
export default xpService;
