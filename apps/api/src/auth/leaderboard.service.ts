import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
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

const DEMO_USERS = [
  {
    firstName: 'Aryan',
    lastName: 'Mehta',
    username: 'aryan',
    email: 'aryan@studysync.demo',
    level: 12,
    xp: 12500,
    studyHours: 24.5,
    streak: 18,
    achievementsCount: 15,
  },
  {
    firstName: 'Priya',
    lastName: 'Sharma',
    username: 'priya',
    email: 'priya@studysync.demo',
    level: 11,
    xp: 11900,
    studyHours: 21.0,
    streak: 14,
    achievementsCount: 12,
  },
  {
    firstName: 'Rohan',
    lastName: 'Verma',
    username: 'rohann',
    email: 'rohan@studysync.demo',
    level: 10,
    xp: 10600,
    studyHours: 18.2,
    streak: 12,
    achievementsCount: 10,
  },
  {
    firstName: 'Neha',
    lastName: 'Kapoor',
    username: 'neha_k',
    email: 'neha@studysync.demo',
    level: 9,
    xp: 9400,
    studyHours: 16.5,
    streak: 10,
    achievementsCount: 9,
  },
  {
    firstName: 'Aditya',
    lastName: 'Singh',
    username: 'aditya',
    email: 'aditya@studysync.demo',
    level: 8,
    xp: 7800,
    studyHours: 14.0,
    streak: 8,
    achievementsCount: 8,
  },
  {
    firstName: 'Sneha',
    lastName: 'Gupta',
    username: 'sneha_g',
    email: 'sneha@studysync.demo',
    level: 7,
    xp: 5900,
    studyHours: 11.5,
    streak: 6,
    achievementsCount: 7,
  },
  {
    firstName: 'Karan',
    lastName: 'Malhotra',
    username: 'karan_m',
    email: 'karan@studysync.demo',
    level: 6,
    xp: 3200,
    studyHours: 8.0,
    streak: 4,
    achievementsCount: 5,
  },
  {
    firstName: 'Aisha',
    lastName: 'Khan',
    username: 'aisha',
    email: 'aisha@studysync.demo',
    level: 5,
    xp: 2900,
    studyHours: 7.2,
    streak: 3,
    achievementsCount: 4,
  },
  {
    firstName: 'Vivek',
    lastName: 'Jain',
    username: 'vivek_j',
    email: 'vivek@studysync.demo',
    level: 5,
    xp: 2500,
    studyHours: 6.5,
    streak: 3,
    achievementsCount: 4,
  },
  {
    firstName: 'Ananya',
    lastName: 'Roy',
    username: 'ananya',
    email: 'ananya@studysync.demo',
    level: 4,
    xp: 2100,
    studyHours: 5.8,
    streak: 2,
    achievementsCount: 3,
  },
  {
    firstName: 'Rahul',
    lastName: 'Bansal',
    username: 'rahul_b',
    email: 'rahul@studysync.demo',
    level: 4,
    xp: 1800,
    studyHours: 4.5,
    streak: 2,
    achievementsCount: 3,
  },
  {
    firstName: 'Ishita',
    lastName: 'Agarwal',
    username: 'ishita',
    email: 'ishita@studysync.demo',
    level: 3,
    xp: 1500,
    studyHours: 3.8,
    streak: 1,
    achievementsCount: 2,
  },
  {
    firstName: 'Arjun',
    lastName: 'Patel',
    username: 'arjun_p',
    email: 'arjun@studysync.demo',
    level: 3,
    xp: 1200,
    studyHours: 3.0,
    streak: 1,
    achievementsCount: 2,
  },
  {
    firstName: 'Meera',
    lastName: 'Joshi',
    username: 'meera',
    email: 'meera@studysync.demo',
    level: 2,
    xp: 900,
    studyHours: 2.2,
    streak: 1,
    achievementsCount: 1,
  },
  {
    firstName: 'Dev',
    lastName: 'Khanna',
    username: 'dev_k',
    email: 'dev@studysync.demo',
    level: 2,
    xp: 700,
    studyHours: 1.8,
    streak: 0,
    achievementsCount: 1,
  },
  {
    firstName: 'Nikhil',
    lastName: 'Saini',
    username: 'nikhil',
    email: 'nikhil@studysync.demo',
    level: 1,
    xp: 500,
    studyHours: 1.2,
    streak: 0,
    achievementsCount: 0,
  },
  {
    firstName: 'Tanya',
    lastName: 'Arora',
    username: 'tanya_a',
    email: 'tanya@studysync.demo',
    level: 1,
    xp: 300,
    studyHours: 0.8,
    streak: 0,
    achievementsCount: 0,
  },
  {
    firstName: 'Yash',
    lastName: 'Saxena',
    username: 'yash',
    email: 'yash@studysync.demo',
    level: 1,
    xp: 200,
    studyHours: 0.5,
    streak: 0,
    achievementsCount: 0,
  },
];

function getDemoAvatar(firstName: string, lastName: string): string {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  const colors = [
    '%23F59E0B', // Amber
    '%23EC4899', // Pink
    '%233B82F6', // Blue
    '%2310B981', // Emerald
    '%238B5CF6', // Violet
    '%23F43F5E', // Rose
    '%2306B6D4', // Cyan
    '%2384CC16', // Lime
    '%236366F1', // Indigo
    '%2314B8A6', // Teal
    '%23F97316', // Orange
    '%23D946EF', // Fuchsia
    '%23A855F7', // Purple
    '%2322C55E', // Green
  ];
  const charCodeSum = initials.charCodeAt(0) + initials.charCodeAt(1);
  const color = colors[charCodeSum % colors.length];

  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="${color}"/><text x="50" y="55" font-family="Arial" font-size="35" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
}

@Injectable()
export class LeaderboardService implements OnModuleInit {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    if (process.env.NODE_ENV !== 'production') {
      await this.cleanAndSeedDemoData();
    }
  }

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
      list: rankedList.slice(0, 20), // Top 20
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
      list: rankedList.slice(0, 20), // Top 20
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
      .slice(0, 20); // limit cohort buddies
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

    const activeLearners = mapped.filter(
      (u) => u.xp > 0 || u.studyHours > 0 || u.quizAccuracy > 0,
    );

    // Secondary sorts: Study Hours, then Quiz Accuracy
    return activeLearners.sort((a, b) => {
      if (b.xp !== a.xp) return b.xp - a.xp;
      if (b.studyHours !== a.studyHours) return b.studyHours - a.studyHours;
      return b.quizAccuracy - a.quizAccuracy;
    });
  }

  async cleanAndSeedDemoData(): Promise<void> {
    try {
      this.logger.log('Cleaning duplicate dev/test profiles...');

      // 1. Delete users matching test patterns (e.g., Alice, Bob, Test)
      const testPatterns = [
        'test',
        'alice',
        'bob',
        'verify',
        'avat',
        'dummy',
        'sample',
        'temp',
      ];

      const users = await this.prisma.user.findMany({
        include: { profile: true },
      });

      for (const user of users) {
        const email = user.email.toLowerCase();
        const username = user.profile?.username?.toLowerCase() || '';
        const displayName = user.profile?.displayName?.toLowerCase() || '';

        const isTest = testPatterns.some(
          (pat) =>
            email.includes(pat) ||
            username.includes(pat) ||
            displayName.includes(pat),
        );

        if (isTest && !email.includes('studysync.demo')) {
          this.logger.log(`Removing dev test user: ${user.email}`);
          await this.prisma.user
            .delete({ where: { id: user.id } })
            .catch(() => {});
        }
      }

      // 2. Seed 18 realistic demo users
      this.logger.log('Seeding clean demo leaderboard contestants...');
      for (const du of DEMO_USERS) {
        const existingUser = await this.prisma.user.findUnique({
          where: { email: du.email },
        });

        if (!existingUser) {
          const avatarUrl = getDemoAvatar(du.firstName, du.lastName);
          const newUser = await this.prisma.user.create({
            data: {
              email: du.email,
              passwordHash:
                '$2b$10$demoUserPasswordHashForTestPlaceholderValues',
              role: 'STUDENT',
              profile: {
                create: {
                  firstName: du.firstName,
                  lastName: du.lastName,
                  username: du.username,
                  displayName: `${du.firstName} ${du.lastName}`,
                  avatarUrl,
                  level: du.level,
                  xp: du.xp,
                  lifetimeXp: du.xp * 2,
                },
              },
            },
          });

          // Add XpLog for weekly/monthly calculations
          await this.prisma.xpLog.create({
            data: {
              userId: newUser.id,
              amount: du.xp,
              source: 'STUDY_SESSION',
              description: 'Focus session rewards',
            },
          });

          // Add PomodoroSessions for studyHours and streak count
          await this.prisma.pomodoroSession.create({
            data: {
              userId: newUser.id,
              durationMinutes: Math.round(du.studyHours * 60),
              completed: true,
            },
          });

          // Add User achievements dummy targets
          for (let i = 0; i < du.achievementsCount; i++) {
            await this.prisma.userAchievement
              .create({
                data: {
                  userId: newUser.id,
                  achievementId: `ach-demo-${i + 1}`,
                  progress: 100,
                  target: 100,
                  unlocked: true,
                  unlockedAt: new Date(),
                  xpGranted: 100,
                },
              })
              .catch(() => {}); // ignore duplicates
          }
        }
      }

      this.logger.log('Leaderboard cleanup and seed completed.');
    } catch (e) {
      this.logger.error('Error cleaning or seeding demo data:', e);
    }
  }
}
