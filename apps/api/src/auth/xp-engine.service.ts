import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface XpConfig {
  NOTE_CREATED: number;
  POMODORO_COMPLETED: number;
  STUDY_HOUR: number;
  FLASHCARDS_GENERATED: number;
  QUIZ_COMPLETED: number;
  QUIZ_PERFECT: number;
  AI_SUMMARY_GENERATED: number;
  GOAL_COMPLETED: number;
  DAILY_STREAK_MAINTAINED: number;
  DOCUMENT_UPLOADED: number;
}

export const XP_VALUES: XpConfig = {
  NOTE_CREATED: 10,
  POMODORO_COMPLETED: 25,
  STUDY_HOUR: 60,
  FLASHCARDS_GENERATED: 20,
  QUIZ_COMPLETED: 50,
  QUIZ_PERFECT: 100,
  AI_SUMMARY_GENERATED: 15,
  GOAL_COMPLETED: 40,
  DAILY_STREAK_MAINTAINED: 35,
  DOCUMENT_UPLOADED: 15,
};

export function getRankTitleByLevel(level: number): string {
  if (level >= 100) return 'StudySync Legend';
  if (level >= 75) return 'Grandmaster';
  if (level >= 50) return 'Master Scholar';
  if (level >= 35) return 'Researcher';
  if (level >= 20) return 'Scholar';
  if (level >= 10) return 'Knowledge Seeker';
  if (level >= 5) return 'Study Explorer';
  return 'Fresh Learner';
}

export function classifySubject(text: string): string | null {
  const lower = text.toLowerCase();
  if (
    lower.includes('operating') ||
    lower.includes('cpu') ||
    lower.includes('scheduling') ||
    lower.includes('kernel') ||
    lower.includes('process')
  ) {
    return 'Operating Systems';
  }
  if (
    lower.includes('dbms') ||
    lower.includes('database') ||
    lower.includes('sql') ||
    lower.includes('query') ||
    lower.includes('nosql')
  ) {
    return 'DBMS';
  }
  if (
    lower.includes('network') ||
    lower.includes('tcp') ||
    lower.includes('ip') ||
    lower.includes('router') ||
    lower.includes('http')
  ) {
    return 'Computer Networks';
  }
  if (
    lower.includes('dsa') ||
    lower.includes('algorithm') ||
    lower.includes('tree') ||
    lower.includes('graph') ||
    lower.includes('sorting')
  ) {
    return 'DSA';
  }
  if (
    lower.includes('machine learning') ||
    lower.includes('ml') ||
    lower.includes('regression') ||
    lower.includes('neural')
  ) {
    return 'Machine Learning';
  }
  if (
    lower.includes('cyber') ||
    lower.includes('security') ||
    lower.includes('hack') ||
    lower.includes('cryptography') ||
    lower.includes('firewall')
  ) {
    return 'Cyber Security';
  }
  if (
    lower.includes('ai') ||
    lower.includes('artificial') ||
    lower.includes('intelligence') ||
    lower.includes('gemini') ||
    lower.includes('gpt') ||
    lower.includes('tutor') ||
    lower.includes('prompt')
  ) {
    return 'AI';
  }
  return null;
}

@Injectable()
export class XpEngineService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // GRANT XP
  // ==========================================

  async grantXp(
    userId: string,
    source: keyof XpConfig | 'ACHIEVEMENT_UNLOCKED' | 'MANUAL',
    description: string,
    customAmount?: number,
  ) {
    let amount = customAmount || 0;

    if (source !== 'ACHIEVEMENT_UNLOCKED' && source !== 'MANUAL') {
      amount = XP_VALUES[source] || 0;
    }

    if (amount <= 0) {
      return { success: false, reason: 'Zero or negative XP amount' };
    }

    // ANTI-CHEAT: Spike Check
    if (amount > 500) {
      return { success: false, reason: 'Suspicious XP spike detected' };
    }

    // ANTI-CHEAT: Duplicate Check
    const twoSecondsAgo = new Date(Date.now() - 2000);
    const duplicateLog = await this.prisma.xpLog.findFirst({
      where: {
        userId,
        source,
        description,
        createdAt: { gte: twoSecondsAgo },
      },
    });

    if (duplicateLog) {
      return { success: false, reason: 'Duplicate XP event ignored' };
    }

    // 1. Create XP transaction log
    await this.prisma.xpLog.create({
      data: {
        userId,
        amount,
        source,
        description,
      },
    });

    // 2. Fetch profile to fetch current milestones
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const newXp = profile.xp + amount;
    const newLifetimeXp = profile.lifetimeXp + amount;

    // Calculate new level recursively based on 25 * L * (L + 2) formula
    let level = 1;
    while (true) {
      const nextXpNeeded = 25 * level * (level + 3);
      if (newXp >= nextXpNeeded) {
        level++;
      } else {
        break;
      }
    }

    const leveledUp = level > profile.level;

    // 3. Save profile stats
    await this.prisma.profile.update({
      where: { userId },
      data: {
        xp: newXp,
        lifetimeXp: newLifetimeXp,
        level: level,
        levelUpAcknowledged: leveledUp ? false : profile.levelUpAcknowledged,
      },
    });

    // 4. Update Subject XP if classification succeeds
    const subject = classifySubject(description);
    if (subject) {
      const existingSub = await this.prisma.subjectXp.findUnique({
        where: { userId_subject: { userId, subject } },
      });
      if (existingSub) {
        await this.prisma.subjectXp.update({
          where: { id: existingSub.id },
          data: { xp: { increment: amount } },
        });
      } else {
        await this.prisma.subjectXp.create({
          data: { userId, subject, xp: amount },
        });
      }
    }

    return {
      success: true,
      amount,
      newXp,
      level,
      leveledUp,
      previousLevel: profile.level,
      title: getRankTitleByLevel(level),
    };
  }

  // ==========================================
  // HISTORIES & STATS
  // ==========================================

  async getXpTimeline(userId: string, limit: number = 50) {
    return this.prisma.xpLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getXpStatistics(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        user: { select: { createdAt: true } },
      },
    });

    if (!profile) throw new NotFoundException('Profile not found');

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Sum aggregates
    const dailySum = await this.prisma.xpLog.aggregate({
      where: { userId, createdAt: { gte: startOfToday } },
      _sum: { amount: true },
    });
    const weeklySum = await this.prisma.xpLog.aggregate({
      where: { userId, createdAt: { gte: startOfWeek } },
      _sum: { amount: true },
    });
    const monthlySum = await this.prisma.xpLog.aggregate({
      where: { userId, createdAt: { gte: startOfMonth } },
      _sum: { amount: true },
    });

    // Highest XP Day using raw DB query grouping
    const highestDayResult = await this.prisma.$queryRaw<{ total: number }[]>`
      SELECT SUM("amount")::int as total, TO_CHAR("createdAt", 'YYYY-MM-DD') as date
      FROM "XpLog"
      WHERE "userId" = ${userId}
      GROUP BY date
      ORDER BY total DESC
      LIMIT 1
    `;
    const highestXpDay = highestDayResult[0]?.total || 0;

    // Daily Average XP
    const daysSinceStart = Math.max(
      1,
      Math.ceil(
        (Date.now() - profile.user.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      ),
    );
    const averageXpPerDay = Math.round(profile.lifetimeXp / daysSinceStart);

    return {
      dailyXp: dailySum._sum.amount || 0,
      weeklyXp: weeklySum._sum.amount || 0,
      monthlyXp: monthlySum._sum.amount || 0,
      lifetimeXp: profile.lifetimeXp,
      averageXpPerDay,
      highestXpDay,
    };
  }

  // ==========================================
  // NOTIFICATIONS
  // ==========================================

  async getLevelUpAlert(userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (profile && !profile.levelUpAcknowledged) {
      return {
        level: profile.level,
        title: getRankTitleByLevel(profile.level),
        xp: profile.xp,
      };
    }
    return null;
  }

  async acknowledgeLevelUp(userId: string) {
    return this.prisma.profile.update({
      where: { userId },
      data: { levelUpAcknowledged: true },
    });
  }

  // Helper level projection calculator
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
