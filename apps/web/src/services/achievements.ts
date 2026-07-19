import api from '@/lib/axios';

export interface UserAchievement {
  id: string;
  title: string;
  description: string;
  category: 'Streak' | 'Study Hours' | 'Focus Sessions' | 'Notes' | 'Quizzes' | 'Flashcards' | 'AI Usage' | 'Goals' | 'Documents' | 'Special';
  tier: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';
  icon: string;
  isSecret: boolean;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: number;
  target: number;
  rewardXP: number;
  rarityPercentage: number;
  acknowledged: boolean;
}

class AchievementsService {
  async getAchievements(): Promise<UserAchievement[]> {
    const res = await api.get('/achievements');
    return res.data;
  }

  async getPendingNotifications(): Promise<UserAchievement[]> {
    const res = await api.get('/achievements/notifications');
    return res.data;
  }

  async acknowledgeAchievement(id: string): Promise<{ success: boolean }> {
    const res = await api.post(`/achievements/${id}/acknowledge`);
    return res.data;
  }
}

const achievementsService = new AchievementsService();
export default achievementsService;
