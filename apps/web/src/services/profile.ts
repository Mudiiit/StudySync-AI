import api from '@/lib/axios';

export interface ProfileStats {
  notesCount: number;
  flashcardsCount: number;
  quizzesCompletedCount: number;
  documentsCount: number;
  aiGenerationsCount: number;
  focusSessionsCount: number;
  studyHours: number;
  streak: number;
  badgesCount: number;
  currentLevel: number;
  friendsCount: number;
}

export interface UserProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  timezone: string;
  bio: string | null;
  username: string | null;
  displayName: string | null;
  usernameUpdatedAt: string | null;
  privacyLevel: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE';
  showStudyHours: boolean;
  showStreak: boolean;
  showBadges: boolean;
  showNotes: boolean;
  showAchievements: boolean;
  xp: number;
  level: number;
  lifetimeXp: number;
  levelUpAcknowledged: boolean;
  weeklyRank?: number;
  monthlyRank?: number;
  bestRankEver?: number;
  highestSubjectRank?: number;
  winsCount?: number;
  createdAt: string;
  updatedAt: string;
  email?: string;
  stats: ProfileStats | null;
  isOwner?: boolean;
  status?: string;
}

class ProfileService {
  async getMyProfile(): Promise<UserProfile> {
    const res = await api.get('/profile/me');
    return res.data;
  }

  async getProfile(userIdOrUsername: string): Promise<UserProfile> {
    const res = await api.get(`/profile/${userIdOrUsername}`);
    return res.data;
  }

  async checkUsernameAvailability(username: string): Promise<{ available: boolean; reason?: string }> {
    const res = await api.get(`/profile/username/check?username=${encodeURIComponent(username)}`);
    return res.data;
  }

  async updateProfile(dto: { displayName?: string; bio?: string; timezone?: string }): Promise<UserProfile> {
    const res = await api.patch('/profile', dto);
    return res.data;
  }

  async updateUsername(username: string): Promise<UserProfile> {
    const res = await api.patch('/profile/username', { username });
    return res.data;
  }

  async updatePrivacy(dto: {
    privacyLevel?: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE';
    showStudyHours?: boolean;
    showStreak?: boolean;
    showBadges?: boolean;
    showNotes?: boolean;
    showAchievements?: boolean;
  }): Promise<UserProfile> {
    const res = await api.patch('/profile/privacy', dto);
    return res.data;
  }

  async selectBuiltInAvatar(avatarUrl: string): Promise<UserProfile> {
    const res = await api.post('/profile/avatar/library', { avatarUrl });
    return res.data;
  }

  async uploadAvatar(file: File): Promise<UserProfile> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/profile/avatar/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  }
}

const profileService = new ProfileService();
export default profileService;
