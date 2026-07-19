import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface LeaderboardUser {
  rank: number;
  previousRank: number;
  rankChange: string; // "▲ +X", "▼ -Y", "New", "="
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  level: number;
  xp: number; // weekly or monthly XP
  studyHours: number;
  streak: number;
  achievementsCount: number;
  quizAccuracy: number;
}

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(private prisma: PrismaService) {}

  // ==========================================
  // GET WEEKLY LEADERBOARD
  // ==========================================
  async getWeeklyLeaderboard(userId: string): Promise<{
    list: LeaderboardUser[];
    currentUser: LeaderboardUser | null;
    countdownSeconds: number;
  }> {
    const list = await this.computeWeeklyStandings();

    // Sort & assign final ranks
    const rankedList: LeaderboardUser[] = list.map((user, idx) => {
      const rank = idx + 1;
      const prev = user.previousRank;
      let rankChange = '=';

      if (prev === 0) {
        rankChange = 'New';
      } else if (prev > rank) {
        rankChange = `▲ +${prev - rank}`;
      } else if (prev < rank) {
        rankChange = `▼ -${rank - prev}`;
      }

      return {
        ...user,
        rank,
        rankChange,
      };
    });

    const currentUser = rankedList.find((u) => u.userId === userId) || null;

    // Countdown until Monday 00:00
    const now = new Date();
    const nextMonday = new Date();
    nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
    nextMonday.setHours(0, 0, 0, 0);
    const countdownSeconds = Math.max(
      0,
      Math.floor((nextMonday.getTime() - now.getTime()) / 1000),
    );

    return {
      list: rankedList.slice(0, 100), // Top 100
      currentUser,
      countdownSeconds,
    };
  }

  // ==========================================
  // GET MONTHLY LEADERBOARD
  // ==========================================
  async getMonthlyLeaderboard(userId: string): Promise<{
    list: LeaderboardUser[];
    currentUser: LeaderboardUser | null;
    countdownSeconds: number;
  }> {
    const list = await this.computeMonthlyStandings();

    const rankedList: LeaderboardUser[] = list.map((user, idx) => {
      const rank = idx + 1;
      const prev = user.previousRank;
      let rankChange = '=';

      if (prev === 0) {
        rankChange = 'New';
      } else if (prev > rank) {
        rankChange = `▲ +${prev - rank}`;
      } else if (prev < rank) {
        rankChange = `▼ -${rank - prev}`;
      }

      return {
        ...user,
        rank,
        rankChange,
      };
    });

    const currentUser = rankedList.find((u) => u.userId === userId) || null;

    // Countdown until first day of next month
    const now = new Date();
    const nextMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1,
      0,
      0,
      0,
      0,
    );
    const countdownSeconds = Math.max(
      0,
      Math.floor((nextMonth.getTime() - now.getTime()) / 1000),
    );

    return {
      list: rankedList.slice(0, 100),
      currentUser,
      countdownSeconds,
    };
  }

  // ==========================================
  // GET FRIENDS LEADERBOARD
  // ==========================================
  async getFriendsLeaderboard(
    userId: string,
    period: 'weekly' | 'monthly' | 'alltime',
  ): Promise<LeaderboardUser[]> {
    // In this phase, we do NOT implement a full friends database setup.
    // To allow verifying the friends leaderboard tab infrastructure,
    // we query user profiles and return them as matching study buddies.
    const allUsers =
      period === 'weekly'
        ? await this.computeWeeklyStandings()
        : period === 'monthly'
          ? await this.computeMonthlyStandings()
          : await this.computeAllTimeStandings();

    // Just rank and return the cohort list
    return allUsers
      .map((user, idx) => {
        const rank = idx + 1;
        const prev = user.previousRank;
        let rankChange = '=';

        if (prev === 0) {
          rankChange = 'New';
        } else if (prev > rank) {
          rankChange = `▲ +${prev - rank}`;
        } else if (prev < rank) {
          rankChange = `▼ -${rank - prev}`;
        }

        return {
          ...user,
          rank,
          rankChange,
        };
      })
      .slice(0, 50); // limit cohort buddies
  }

  // ==========================================
  // GET SUBJECT LEADERBOARD
  // ==========================================
  async getSubjectLeaderboard(subject: string): Promise<any[]> {
    // Ranks users automatically by subject specific XP
    const list = await this.prisma.subjectXp.findMany({
      where: { subject },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: { xp: 'desc' },
    });

    return list.map((item, idx) => ({
      rank: idx + 1,
      userId: item.userId,
      username: item.user.profile?.username || 'user',
      displayName: item.user.profile?.displayName || 'User',
      avatarUrl: item.user.profile?.avatarUrl || '',
      level: item.user.profile?.level || 1,
      xp: item.xp,
      subject: item.subject,
    }));
  }

  // ==========================================
  // HALL OF CHAMPIONS
  // ==========================================
  async getHallOfChampions(): Promise<any[]> {
    const list = await this.prisma.leaderboardArchive.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    return list.map((item) => ({
      id: item.id,
      userId: item.userId,
      username: item.user.profile?.username || 'user',
      avatarUrl: item.user.profile?.avatarUrl || '',
      type: item.type,
      period: item.period,
      xp: item.xp,
      studyHours: item.studyHours,
      rank: item.rank,
      createdAt: item.createdAt,
    }));
  }

  // ==========================================
  // WEEKLY RESET SCHEDULER LOGIC
  // ==========================================
  async triggerWeeklyReset(): Promise<void> {
    const standings = await this.computeWeeklyStandings();
    if (standings.length === 0) return;

    const winner = standings[0];

    // Archive week's winner
    const now = new Date();
    // Get week representation, e.g. "2026-W27"
    const startOfWeek = new Date();
    startOfWeek.setDate(
      startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7),
    );
    const year = startOfWeek.getFullYear();
    const oneJan = new Date(year, 0, 1);
    const numberOfDays = Math.floor(
      (startOfWeek.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000),
    );
    const weekNumber = Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
    const period = `${year}-W${weekNumber}`;

    // Prevent duplicate wins in archive
    const existing = await this.prisma.leaderboardArchive.findFirst({
      where: { type: 'WEEKLY', period },
    });

    if (!existing) {
      await this.prisma.leaderboardArchive.create({
        data: {
          userId: winner.userId,
          type: 'WEEKLY',
          period,
          xp: winner.xp,
          studyHours: winner.studyHours,
          rank: 1,
        },
      });

      // Increment wins count
      await this.prisma.profile.update({
        where: { userId: winner.userId },
        data: { winsCount: { increment: 1 } },
      });
    }

    // Reset Ranks history
    const allProfiles = await this.prisma.profile.findMany();
    for (const prof of allProfiles) {
      const idx = standings.findIndex((s) => s.userId === prof.userId);
      const newRank = idx !== -1 ? idx + 1 : 0;
      await this.prisma.profile.update({
        where: { id: prof.id },
        data: {
          previousWeeklyRank: newRank,
          weeklyRank: 0,
        },
      });
    }
  }

  // ==========================================
  // MONTHLY RESET SCHEDULER LOGIC
  // ==========================================
  async triggerMonthlyReset(): Promise<void> {
    const standings = await this.computeMonthlyStandings();
    if (standings.length === 0) return;

    const winner = standings[0];

    const now = new Date();
    const period = `${now.getFullYear()}-M${String(now.getMonth() + 1).padStart(2, '0')}`;

    const existing = await this.prisma.leaderboardArchive.findFirst({
      where: { type: 'MONTHLY', period },
    });

    if (!existing) {
      await this.prisma.leaderboardArchive.create({
        data: {
          userId: winner.userId,
          type: 'MONTHLY',
          period,
          xp: winner.xp,
          studyHours: winner.studyHours,
          rank: 1,
        },
      });

      // Increment wins count
      await this.prisma.profile.update({
        where: { userId: winner.userId },
        data: { winsCount: { increment: 1 } },
      });
    }

    // Reset monthly rank
    const allProfiles = await this.prisma.profile.findMany();
    for (const prof of allProfiles) {
      const idx = standings.findIndex((s) => s.userId === prof.userId);
      const newRank = idx !== -1 ? idx + 1 : 0;
      await this.prisma.profile.update({
        where: { id: prof.id },
        data: {
          previousMonthlyRank: newRank,
          monthlyRank: 0,
        },
      });
    }
  }

  // ==========================================
  // RECALCULATE LEADERBOARD RANKS (REAL-TIME UPDATE CACHE)
  // ==========================================
  async recalculateRanks(): Promise<void> {
    // 1. Recalculate Weekly
    const weeklyStandings = await this.computeWeeklyStandings();
    for (let i = 0; i < weeklyStandings.length; i++) {
      const u = weeklyStandings[i];
      const rank = i + 1;
      const prof = await this.prisma.profile.findUnique({
        where: { userId: u.userId },
      });
      if (prof) {
        const nextBestRank =
          prof.bestRankEver === 0 ? rank : Math.min(prof.bestRankEver, rank);
        await this.prisma.profile.update({
          where: { userId: u.userId },
          data: {
            previousWeeklyRank: prof.weeklyRank === 0 ? rank : prof.weeklyRank,
            weeklyRank: rank,
            bestRankEver: nextBestRank,
          },
        });
      }
    }

    // 2. Recalculate Monthly
    const monthlyStandings = await this.computeMonthlyStandings();
    for (let i = 0; i < monthlyStandings.length; i++) {
      const u = monthlyStandings[i];
      const rank = i + 1;
      const prof = await this.prisma.profile.findUnique({
        where: { userId: u.userId },
      });
      if (prof) {
        const nextBestRank =
          prof.bestRankEver === 0 ? rank : Math.min(prof.bestRankEver, rank);
        await this.prisma.profile.update({
          where: { userId: u.userId },
          data: {
            previousMonthlyRank:
              prof.monthlyRank === 0 ? rank : prof.monthlyRank,
            monthlyRank: rank,
            bestRankEver: nextBestRank,
          },
        });
      }
    }
  }

  // ==========================================
  // INTERNAL: COMPUTE STANDINGS
  // ==========================================
  private async computeWeeklyStandings(): Promise<any[]> {
    const startOfWeek = new Date();
    startOfWeek.setDate(
      startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7),
    );
    startOfWeek.setHours(0, 0, 0, 0);

    return this.aggregateStandings(startOfWeek);
  }

  private async computeMonthlyStandings(): Promise<any[]> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    return this.aggregateStandings(startOfMonth);
  }

  private async computeAllTimeStandings(): Promise<any[]> {
    // Beginning of timeline
    return this.aggregateStandings(new Date(0));
  }

  private async aggregateStandings(sinceDate: Date): Promise<any[]> {
    const users = await this.prisma.user.findMany({
      include: {
        profile: true,
        xpLogs: {
          where: { createdAt: { gte: sinceDate } },
        },
        pomodoroSessions: {
          where: { createdAt: { gte: sinceDate } },
        },
        attempts: {
          where: { startedAt: { gte: sinceDate } },
        },
        achievements: true,
      },
    });

    const mapped = users.map((u) => {
      const p = u.profile;
      const xp = u.xpLogs.reduce((acc: number, l: any) => acc + l.amount, 0);
      const studyHours =
        u.pomodoroSessions.reduce(
          (acc: number, s: any) => acc + s.durationMinutes,
          0,
        ) / 60.0;

      let quizAccuracy = 0;
      if (u.attempts.length > 0) {
        const totalScore = u.attempts.reduce(
          (acc: number, a: any) => acc + (a.score || 0),
          0,
        );
        quizAccuracy = Math.round(totalScore / u.attempts.length);
      }

      let streak = 0;
      if (u.pomodoroSessions.length > 0) {
        streak = u.pomodoroSessions.length;
      }

      return {
        userId: u.id,
        username: p?.username || 'learner',
        displayName: p?.displayName || p?.firstName || 'Learner',
        avatarUrl: p?.avatarUrl || '',
        level: p?.level || 1,
        xp,
        studyHours,
        streak,
        achievementsCount: u.achievements.length,
        quizAccuracy,
        previousRank:
          sinceDate.getTime() === 0 ? 0 : p?.previousWeeklyRank || 0,
      };
    });

    // Secondary sorts: Study Hours, then Quiz Accuracy
    return mapped.sort((a, b) => {
      if (b.xp !== a.xp) return b.xp - a.xp;
      if (b.studyHours !== a.studyHours) return b.studyHours - a.studyHours;
      return b.quizAccuracy - a.quizAccuracy;
    });
  }
}
