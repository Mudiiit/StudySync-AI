import api from '@/lib/axios';

export interface FriendUser {
  id: string;
  avatarUrl: string;
  username: string;
  displayName: string;
  level: number;
  streak: number;
  weeklyRank: number;
  status: string;
  relationship?: string; // "NONE", "FRIEND", "SENT", "RECEIVED", "BLOCKED"
  university?: string;
  department?: string;
  course?: string;
  skills?: string[];
  interests?: string[];
}

export interface FriendRequests {
  incoming: {
    id: string;
    senderId: string;
    avatarUrl: string;
    username: string;
    displayName: string;
    level: number;
    createdAt: string;
  }[];
  outgoing: {
    id: string;
    receiverId: string;
    avatarUrl: string;
    username: string;
    displayName: string;
    level: number;
    createdAt: string;
  }[];
}

export interface StudyGroup {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupDetailsResponse {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  membersCount: number;
  weeklyStudyHours: number;
  announcements: GroupAnnouncement[];
  leaderboard: GroupLeaderboardUser[];
  myRole: string;
}

export interface GroupAnnouncement {
  id: string;
  studyGroupId: string;
  authorId: string;
  title: string;
  content: string;
  createdAt: string;
  author: {
    profile: {
      displayName: string | null;
      firstName: string;
      avatarUrl: string | null;
    } | null;
  };
}

export interface GroupLeaderboardUser {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  xp: number;
  studyHours: number;
  level: number;
  role: string;
}

export interface GroupInviteRecord {
  id: string;
  studyGroupId: string;
  groupName: string;
  inviterName: string;
  createdAt: string;
}

export interface GroupChallenge {
  id: string;
  studyGroupId: string;
  title: string;
  description: string | null;
  type: 'STUDY_HOURS' | 'FLASHCARDS' | 'NOTES' | 'QUIZZES';
  target: number;
  period: 'WEEKLY' | 'MONTHLY';
  startDate: string;
  endDate: string;
  createdAt: string;
  progress: ChallengeProgress[];
}

export interface ChallengeProgress {
  id: string;
  challengeId: string;
  userId: string;
  current: number;
  completed: boolean;
  updatedAt: string;
  user: {
    profile: {
      username: string | null;
      displayName: string | null;
      firstName: string;
      avatarUrl: string | null;
    } | null;
  };
}

export interface SharedNotebook {
  notebook: {
    id: string;
    userId: string;
    title: string;
    color: string;
    icon: string;
    description: string | null;
  };
  role: 'VIEWER' | 'COMMENTER' | 'EDITOR' | 'OWNER';
  ownerName: string;
}

const socialService = {
  // Friends
  searchUsers: async (q: string): Promise<FriendUser[]> => {
    const res = await api.get(`/social/users/search?q=${encodeURIComponent(q)}`);
    return res.data;
  },

  getFriends: async (): Promise<FriendUser[]> => {
    const res = await api.get('/social/friends');
    return res.data;
  },

  getRequests: async (): Promise<FriendRequests> => {
    const res = await api.get('/social/friends/requests');
    return res.data;
  },

  sendRequest: async (receiverId: string): Promise<any> => {
    const res = await api.post(`/social/friends/request?receiverId=${receiverId}`);
    return res.data;
  },

  acceptRequest: async (id: string): Promise<any> => {
    const res = await api.post(`/social/friends/accept/${id}`);
    return res.data;
  },

  rejectRequest: async (id: string): Promise<any> => {
    const res = await api.post(`/social/friends/reject/${id}`);
    return res.data;
  },

  removeFriend: async (friendId: string): Promise<any> => {
    const res = await api.delete(`/social/friends/${friendId}`);
    return res.data;
  },

  cancelRequest: async (id: string): Promise<any> => {
    const res = await api.delete(`/social/friends/request/${id}`);
    return res.data;
  },

  blockUser: async (blockedId: string): Promise<any> => {
    const res = await api.post(`/social/friends/block/${blockedId}`);
    return res.data;
  },

  unblockUser: async (blockedId: string): Promise<any> => {
    const res = await api.post(`/social/friends/unblock/${blockedId}`);
    return res.data;
  },

  getBlocks: async (): Promise<any[]> => {
    const res = await api.get('/social/friends/blocks');
    return res.data;
  },

  heartbeat: async (status: string): Promise<any> => {
    const res = await api.post(`/social/status/heartbeat?status=${encodeURIComponent(status)}`);
    return res.data;
  },

  // Groups
  getGroups: async (): Promise<StudyGroup[]> => {
    const res = await api.get('/social/groups');
    return res.data;
  },

  createGroup: async (name: string, description?: string): Promise<StudyGroup> => {
    const res = await api.post('/social/groups', { name, description });
    return res.data;
  },

  getGroupDetails: async (id: string): Promise<GroupDetailsResponse> => {
    const res = await api.get(`/social/groups/${id}`);
    return res.data;
  },

  editGroup: async (id: string, body: { name?: string; description?: string; transferOwnerId?: string }): Promise<any> => {
    const res = await api.patch(`/social/groups/${id}`, body);
    return res.data;
  },

  inviteFriend: async (id: string, friendId: string): Promise<any> => {
    const res = await api.post(`/social/groups/${id}/invite?friendId=${friendId}`);
    return res.data;
  },

  getInvites: async (): Promise<GroupInviteRecord[]> => {
    const res = await api.get('/social/groups/invites');
    return res.data;
  },

  acceptInvite: async (inviteId: string): Promise<any> => {
    const res = await api.post(`/social/groups/invites/${inviteId}/accept`);
    return res.data;
  },

  rejectInvite: async (inviteId: string): Promise<any> => {
    const res = await api.post(`/social/groups/invites/${inviteId}/reject`);
    return res.data;
  },

  leaveGroup: async (id: string): Promise<any> => {
    const res = await api.post(`/social/groups/${id}/leave`);
    return res.data;
  },

  kickMember: async (id: string, targetId: string): Promise<any> => {
    const res = await api.post(`/social/groups/${id}/kick/${targetId}`);
    return res.data;
  },

  updateRole: async (id: string, targetUserId: string, role: 'ADMIN' | 'MEMBER'): Promise<any> => {
    const res = await api.post(`/social/groups/${id}/role`, { targetUserId, role });
    return res.data;
  },

  getAnnouncements: async (id: string): Promise<GroupAnnouncement[]> => {
    const res = await api.get(`/social/groups/${id}/announcements`);
    return res.data;
  },

  postAnnouncement: async (id: string, body: { title: string; content: string }): Promise<GroupAnnouncement> => {
    const res = await api.post(`/social/groups/${id}/announcements`, body);
    return res.data;
  },

  getResources: async (id: string): Promise<any[]> => {
    const res = await api.get(`/social/groups/${id}/resources`);
    return res.data;
  },

  shareResource: async (id: string, body: { resourceType: string; resourceId: string }): Promise<any> => {
    const res = await api.post(`/social/groups/${id}/resources`, body);
    return res.data;
  },

  unshareResource: async (id: string, resourceId: string): Promise<any> => {
    const res = await api.delete(`/social/groups/${id}/resources/${resourceId}`);
    return res.data;
  },

  // Challenges
  getGroupChallenges: async (groupId: string): Promise<GroupChallenge[]> => {
    const res = await api.get(`/social/groups/${groupId}/challenges`);
    return res.data;
  },

  createChallenge: async (groupId: string, body: { title: string; description?: string; type: string; target: number; period: string }): Promise<GroupChallenge> => {
    const res = await api.post(`/social/groups/${groupId}/challenges`, body);
    return res.data;
  },

  // Notebooks
  getSharedNotebooks: async (): Promise<SharedNotebook[]> => {
    const res = await api.get('/social/notebooks/shared');
    return res.data;
  },

  shareNotebook: async (id: string, body: { targetUserId: string; role: string }): Promise<any> => {
    const res = await api.post(`/social/notebooks/${id}/share`, body);
    return res.data;
  },

  revokeShare: async (id: string, targetUserId: string): Promise<any> => {
    const res = await api.delete(`/social/notebooks/${id}/share/${targetUserId}`);
    return res.data;
  }
};

export default socialService;
