import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);
  private memoryPresence = new Map<
    string,
    { page: string; lastActive: string }
  >();
  private notePresence = new Map<
    string,
    {
      noteId: string;
      userId: string;
      name: string;
      email: string;
      avatarUrl?: string;
      cursorColor: string;
      lastActive: string;
      cursor?: { from: number; to: number };
    }
  >();
  private groupPresence = new Map<
    string,
    {
      groupId: string;
      userId: string;
      name: string;
      email: string;
      avatarUrl?: string;
      status?: string;
      lastActive: string;
    }
  >();

  setGroupActive(
    socketId: string,
    groupId: string,
    userId: string,
    details: {
      name: string;
      email: string;
      avatarUrl?: string;
      status?: string;
    },
  ) {
    this.groupPresence.set(socketId, {
      groupId,
      userId,
      name: details.name,
      email: details.email,
      avatarUrl: details.avatarUrl,
      status: details.status || 'online',
      lastActive: new Date().toISOString(),
    });

    const session = this.studySessions.get(groupId);
    if (session) {
      if (!session.stats.participants.includes(userId)) {
        session.stats.participants.push(userId);
      }
    }
  }

  setGroupInactive(socketId: string) {
    this.groupPresence.delete(socketId);
  }

  getGroupActiveUsers(groupId: string) {
    const active: any[] = [];
    const seenUsers = new Set<string>();

    for (const p of this.groupPresence.values()) {
      if (p.groupId === groupId) {
        if (!seenUsers.has(p.userId)) {
          seenUsers.add(p.userId);
          active.push(p);
        }
      }
    }
    return active;
  }

  setNoteActive(
    socketId: string,
    noteId: string,
    userId: string,
    details: {
      name: string;
      email: string;
      avatarUrl?: string;
      cursorColor: string;
    },
  ) {
    this.notePresence.set(socketId, {
      noteId,
      userId,
      name: details.name,
      email: details.email,
      avatarUrl: details.avatarUrl,
      cursorColor: details.cursorColor,
      lastActive: new Date().toISOString(),
    });
  }

  setNoteInactive(socketId: string) {
    this.notePresence.delete(socketId);
  }

  updateNoteCursor(socketId: string, cursor: { from: number; to: number }) {
    const user = this.notePresence.get(socketId);
    if (user) {
      user.cursor = cursor;
      user.lastActive = new Date().toISOString();
    }
  }

  getNoteActiveUsers(noteId: string) {
    const active: any[] = [];
    const seenUsers = new Set<string>();

    for (const p of this.notePresence.values()) {
      if (p.noteId === noteId) {
        if (!seenUsers.has(p.userId)) {
          seenUsers.add(p.userId);
          active.push(p);
        }
      }
    }
    return active;
  }

  constructor(private redis: RedisService) {}

  async setOnline(userId: string, page: string) {
    const data = { page, lastActive: new Date().toISOString() };
    this.memoryPresence.set(userId, data);

    try {
      const client = this.redis.getRedisClient();
      if (client) {
        await client.hset('presence:active', userId, JSON.stringify(data));
      }
    } catch (e: any) {
      // fail-soft
    }
  }

  async setOffline(userId: string) {
    this.memoryPresence.delete(userId);

    try {
      const client = this.redis.getRedisClient();
      if (client) {
        await client.hdel('presence:active', userId);
      }
    } catch (e: any) {
      // fail-soft
    }
  }

  async getActiveUsers(): Promise<
    Record<string, { page: string; lastActive: string }>
  > {
    try {
      const client = this.redis.getRedisClient();
      if (client) {
        const raw = await client.hgetall('presence:active');
        const parsed: Record<string, any> = {};
        for (const [key, val] of Object.entries(raw)) {
          parsed[key] = JSON.parse(val);
        }
        return parsed;
      }
    } catch (e) {
      // fail-soft
    }

    // In-memory fallback
    const result: Record<string, any> = {};
    for (const [key, val] of this.memoryPresence.entries()) {
      result[key] = val;
    }
    return result;
  }

  private studySessions = new Map<
    string,
    {
      groupId: string;
      isActive: boolean;
      ownerId: string;
      startedAt: string;
      activeResource: any;
      activeResourceProgress: any;
      pomodoro: {
        durationSeconds: number;
        elapsedSeconds: number;
        isPaused: boolean;
      };
      tutorHistory: { role: string; content: string; senderName: string }[];
      stats: {
        aiQuestions: number;
        filesOpened: number;
        quizAttempts: number;
        flashcardsReviewed: number;
        participants: string[];
      };
      focuses: { [userId: string]: string };
    }
  >();

  startStudySession(groupId: string, ownerId: string) {
    this.studySessions.set(groupId, {
      groupId,
      isActive: true,
      ownerId,
      startedAt: new Date().toISOString(),
      activeResource: null,
      activeResourceProgress: null,
      pomodoro: {
        durationSeconds: 1500,
        elapsedSeconds: 0,
        isPaused: true,
      },
      tutorHistory: [],
      stats: {
        aiQuestions: 0,
        filesOpened: 0,
        quizAttempts: 0,
        flashcardsReviewed: 0,
        participants: [ownerId],
      },
      focuses: {},
    });
    return this.studySessions.get(groupId);
  }

  endStudySession(groupId: string) {
    const session = this.studySessions.get(groupId);
    this.studySessions.delete(groupId);
    return session;
  }

  getStudySession(groupId: string) {
    return this.studySessions.get(groupId) || null;
  }

  updatePomodoro(
    groupId: string,
    data: {
      durationSeconds?: number;
      elapsedSeconds?: number;
      isPaused?: boolean;
    },
  ) {
    const session = this.studySessions.get(groupId);
    if (session) {
      if (data.durationSeconds !== undefined)
        session.pomodoro.durationSeconds = data.durationSeconds;
      if (data.elapsedSeconds !== undefined)
        session.pomodoro.elapsedSeconds = data.elapsedSeconds;
      if (data.isPaused !== undefined)
        session.pomodoro.isPaused = data.isPaused;
      return session;
    }
    return null;
  }

  addTutorMessage(
    groupId: string,
    msg: { role: string; content: string; senderName: string },
  ) {
    const session = this.studySessions.get(groupId);
    if (session) {
      session.tutorHistory.push(msg);
      return session;
    }
    return null;
  }

  updateSessionFocus(groupId: string, userId: string, focus: string) {
    const session = this.studySessions.get(groupId);
    if (session) {
      session.focuses[userId] = focus;
      if (!session.stats.participants.includes(userId)) {
        session.stats.participants.push(userId);
      }
      return session;
    }
    return null;
  }

  incrementSessionStat(
    groupId: string,
    userId: string,
    statType:
      'aiQuestions' | 'filesOpened' | 'quizAttempts' | 'flashcardsReviewed',
  ) {
    const session = this.studySessions.get(groupId);
    if (session) {
      session.stats[statType] += 1;
      if (!session.stats.participants.includes(userId)) {
        session.stats.participants.push(userId);
      }
      return session;
    }
    return null;
  }

  setActiveResource(groupId: string, resource: any) {
    const session = this.studySessions.get(groupId);
    if (session) {
      session.activeResource = resource;
      session.activeResourceProgress = null;
      return session;
    }
    return null;
  }

  setActiveResourceProgress(groupId: string, progress: any) {
    const session = this.studySessions.get(groupId);
    if (session) {
      session.activeResourceProgress = {
        ...(session.activeResourceProgress || {}),
        ...progress,
      };
      return session;
    }
    return null;
  }
}
