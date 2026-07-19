import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ACHIEVEMENT_DEFINITIONS,
  AchievementDefinition,
} from './achievement-definitions';
import { XpEngineService } from './xp-engine.service';

@Injectable()
export class AchievementEngineService {
  constructor(
    private prisma: PrismaService,
    private xpEngine: XpEngineService,
  ) {}

  // ==========================================
  // EVALUATE ALL USER ACHIEVEMENTS
  // ==========================================

  async evaluateUserAchievements(userId: string): Promise<any[]> {
    // 1. Gather dynamic learning statistics
    const notesCount = await this.prisma.note.count({ where: { userId } });
    const flashcardsCount = await this.prisma.flashcard.count({
      where: { userId },
    });
    const quizzesCount = await this.prisma.attempt.count({
      where: { userId, completedAt: { not: null } },
    });
    const perfectQuizzesCount = await this.prisma.attempt.count({
      where: { userId, completedAt: { not: null }, percentage: 100 },
    });
    const documentsCount = await this.prisma.document.count({
      where: { userId },
    });
    const pomodorosCompletedCount = await this.prisma.pomodoroSession.count({
      where: { userId, completed: true },
    });
    const goalsCompletedCount = await this.prisma.goal.count({
      where: { userId, isCompleted: true },
    });

    const aiSummaries = await this.prisma.aiUsageLog.count({
      where: { userId, promptType: 'summarize' },
    });
    const aiFlashcards = await this.prisma.aiUsageLog.count({
      where: { userId, promptType: 'create_flashcards' },
    });
    const aiQuizzes = await this.prisma.aiUsageLog.count({
      where: { userId, promptType: 'generate_quiz' },
    });

    // Sum focus duration
    const durationAggregate = await this.prisma.pomodoroSession.aggregate({
      where: { userId, completed: true },
      _sum: { durationMinutes: true },
    });
    const studyHours = Math.round(
      (durationAggregate._sum.durationMinutes || 0) / 60,
    );

    // Calculate streak
    const streak = await this.calculateStreak(userId);

    // Secret Achievements Evaluations
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    const isPrivateProfile = profile?.privacyLevel === 'PRIVATE' ? 1 : 0;

    const ancientFocusCount = await this.prisma.pomodoroSession.count({
      where: { userId, completed: true, durationMinutes: { gte: 120 } },
    });

    const lightningQuizzesCount = await this.prisma.attempt.count({
      where: {
        userId,
        completedAt: { not: null },
        percentage: 100,
        duration: { lt: 30 },
      },
    });

    const resolvedCommentsCount = await this.prisma.noteComment.count({
      where: { resolvedByUserId: userId, resolved: true },
    });

    // Raw SQL to find moon sessions (completed between 12 AM and 4 AM in UTC/database timezone)
    const moonSessionsResult = await this.prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int as count FROM "PomodoroSession" 
      WHERE "userId" = ${userId} AND "completed" = true 
      AND EXTRACT(HOUR FROM "createdAt") >= 0 AND EXTRACT(HOUR FROM "createdAt") < 4
    `;
    const moonSessionsCount = moonSessionsResult[0]?.count || 0;

    // 2. Fetch existing user achievements
    const existingAchievements = await this.prisma.userAchievement.findMany({
      where: { userId },
    });
    const existingMap = new Map(
      existingAchievements.map((ua) => [ua.achievementId, ua]),
    );

    // Total counts of active users to calculate dynamic ownership rarity
    const totalUsers = Math.max(1, await this.prisma.user.count());

    const results: any[] = [];

    // 3. Evaluate progress for every definition
    for (const def of ACHIEVEMENT_DEFINITIONS) {
      let progress = 0;

      // Assign statistic value based on category/id
      if (def.id.startsWith('streak_')) progress = streak;
      else if (def.id.startsWith('hours_')) progress = studyHours;
      else if (def.id.startsWith('focus_')) progress = pomodorosCompletedCount;
      else if (def.id.startsWith('notes_')) progress = notesCount;
      else if (def.id.startsWith('cards_')) progress = flashcardsCount;
      else if (def.id.startsWith('quizzes_')) progress = quizzesCount;
      else if (def.id === 'quiz_perfect_10' || def.id === 'quiz_perfect_100')
        progress = perfectQuizzesCount;
      else if (def.id.startsWith('goals_')) progress = goalsCompletedCount;
      else if (def.id === 'ai_summaries_100') progress = aiSummaries;
      else if (def.id === 'ai_cards_500') progress = aiFlashcards;
      else if (def.id === 'ai_quizzes_250') progress = aiQuizzes;
      else if (def.id.startsWith('docs_')) progress = documentsCount;

      // Secrets
      else if (def.id === 'secret_moon_reader') progress = moonSessionsCount;
      else if (def.id === 'secret_lightning_brain')
        progress = lightningQuizzesCount;
      else if (def.id === 'secret_ancient_mind') progress = ancientFocusCount;
      else if (def.id === 'secret_hidden_scholar') progress = isPrivateProfile;
      else if (def.id === 'secret_mystery_solver')
        progress = resolvedCommentsCount;

      // Cap progress at target
      progress = Math.min(progress, def.target);

      const existingRecord = existingMap.get(def.id);
      const isNewlyUnlocked =
        progress >= def.target && (!existingRecord || !existingRecord.unlocked);
      const unlocked =
        progress >= def.target || (existingRecord?.unlocked ?? false);

      let record;
      if (!existingRecord) {
        record = await this.prisma.userAchievement.create({
          data: {
            userId,
            achievementId: def.id,
            progress,
            target: def.target,
            unlocked,
            unlockedAt: unlocked ? new Date() : null,
            acknowledged: false,
            xpGranted: unlocked ? def.rewardXP : 0,
          },
        });
      } else if (existingRecord.progress !== progress || isNewlyUnlocked) {
        record = await this.prisma.userAchievement.update({
          where: { id: existingRecord.id },
          data: {
            progress,
            unlocked: unlocked || existingRecord.unlocked,
            unlockedAt: isNewlyUnlocked
              ? new Date()
              : existingRecord.unlockedAt,
            acknowledged: isNewlyUnlocked ? false : existingRecord.acknowledged,
            xpGranted: unlocked ? def.rewardXP : 0,
          },
        });
      } else {
        record = existingRecord;
      }

      if (isNewlyUnlocked) {
        await this.xpEngine
          .grantXp(
            userId,
            'ACHIEVEMENT_UNLOCKED',
            `Unlocked Achievement Badge: ${def.title}`,
            def.rewardXP,
          )
          .catch((err) =>
            console.error('Failed to grant XP for achievement:', err),
          );
      }

      // Calculate dynamic user ownership rarity
      const unlockedCount = await this.prisma.userAchievement.count({
        where: { achievementId: def.id, unlocked: true },
      });
      const rarityPercentage =
        Math.round((unlockedCount / totalUsers) * 10000) / 100;

      // Formatting Secret Achievements (only show "???" until unlocked)
      const hideDetails = def.isSecret && !record.unlocked;

      results.push({
        id: def.id,
        title: hideDetails ? '???' : def.title,
        description: hideDetails
          ? 'Unlock this hidden achievement to reveal details'
          : def.description,
        category: def.category,
        tier: def.tier,
        icon: hideDetails ? 'Lock' : def.icon,
        isSecret: def.isSecret || false,
        unlocked: record.unlocked,
        unlockedAt: record.unlockedAt,
        progress: record.progress,
        target: record.target,
        rewardXP: def.rewardXP,
        rarityPercentage: Math.max(0.01, rarityPercentage),
        acknowledged: record.acknowledged,
      });
    }

    return results;
  }

  // ==========================================
  // UNLOCKED NOTIFICATIONS
  // ==========================================

  async getPendingUnlockedNotifications(userId: string) {
    const list = await this.prisma.userAchievement.findMany({
      where: { userId, unlocked: true, acknowledged: false },
    });

    const results: any[] = [];
    for (const item of list) {
      const def = ACHIEVEMENT_DEFINITIONS.find(
        (d) => d.id === item.achievementId,
      );
      if (def) {
        results.push({
          id: item.achievementId,
          title: def.title,
          description: def.description,
          category: def.category,
          tier: def.tier,
          icon: def.icon,
          rewardXP: def.rewardXP,
          unlockedAt: item.unlockedAt,
        });
      }
    }
    return results;
  }

  async acknowledgeAchievement(userId: string, achievementId: string) {
    return this.prisma.userAchievement.updateMany({
      where: { userId, achievementId },
      data: { acknowledged: true },
    });
  }

  // Helper streak calculation
  private async calculateStreak(userId: string): Promise<number> {
    const sessions = await this.prisma.pomodoroSession.findMany({
      where: { userId, completed: true },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    if (sessions.length === 0) return 0;

    const days = Array.from(
      new Set(sessions.map((s) => s.createdAt.toISOString().split('T')[0])),
    );

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const hasToday = days.includes(todayStr);
    const hasYesterday = days.includes(yesterdayStr);

    if (!hasToday && !hasYesterday) return 0;

    let streak = 0;
    const currentCheckDate = hasToday ? new Date() : yesterday;

    while (true) {
      const checkStr = currentCheckDate.toISOString().split('T')[0];
      if (days.includes(checkStr)) {
        streak++;
        currentCheckDate.setDate(currentCheckDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }
}
