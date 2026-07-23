import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfileService {
  private reservedUsernames = [
    'admin',
    'administrator',
    'root',
    'studysync',
    'support',
    'help',
    'api',
    'auth',
    'notes',
    'quizzes',
    'flashcards',
    'tutor',
    'dashboard',
    'settings',
    'profile',
    'user',
    'moderator',
    'system',
    'index',
    'null',
    'undefined',
  ];

  constructor(private prisma: PrismaService) {}

  // ==========================================
  // RETRIEVAL & STATS
  // ==========================================

  async getProfile(userIdOrUsername: string, requestingUserId: string) {
    // 1. Resolve user profile (by userId or username)
    const profile = await this.prisma.profile.findFirst({
      where: {
        OR: [
          { userId: userIdOrUsername },
          { username: userIdOrUsername.toLowerCase() },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            createdAt: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const userId = profile.userId;
    const isOwner = userId === requestingUserId;

    // 2. Fetch statistics dynamically
    const notesCount = await this.prisma.note.count({ where: { userId } });
    const flashcardsCount = await this.prisma.flashcard.count({
      where: { userId },
    });
    const quizzesCompletedCount = await this.prisma.attempt.count({
      where: { userId, completedAt: { not: null } },
    });
    const documentsCount = await this.prisma.document.count({
      where: { userId },
    });
    const aiGenerationsCount = await this.prisma.aiUsageLog.count({
      where: { userId },
    });
    const focusSessionsCount = await this.prisma.pomodoroSession.count({
      where: { userId, completed: true },
    });

    // Sum focus duration
    const durationAggregate = await this.prisma.pomodoroSession.aggregate({
      where: { userId, completed: true },
      _sum: { durationMinutes: true },
    });
    const studyHours =
      Math.round(((durationAggregate._sum.durationMinutes || 0) / 60) * 10) /
      10;

    // Calculate learning streak dynamically based on Pomodoro completion dates
    const streak = await this.calculateStreak(userId);

    // Placeholder achievement metrics
    const badgesCount = 3;
    const currentLevel = Math.max(1, Math.floor(studyHours / 5) + 1);
    const friendsCount = 12;

    const stats = {
      notesCount,
      flashcardsCount,
      quizzesCompletedCount,
      documentsCount,
      aiGenerationsCount,
      focusSessionsCount,
      studyHours,
      streak,
      badgesCount,
      currentLevel,
      friendsCount,
    };

    // 3. Apply privacy filters
    if (isOwner) {
      return {
        ...profile,
        email: profile.user.email,
        stats,
        isOwner: true,
      };
    }

    // Handle privacy checks for other users
    if (profile.privacyLevel === 'PRIVATE') {
      return {
        userId: profile.userId,
        displayName:
          profile.displayName || `${profile.firstName} ${profile.lastName}`,
        username: profile.username ? `@${profile.username}` : null,
        avatarUrl: profile.avatarUrl,
        bio: profile.bio,
        timezone: profile.timezone,
        createdAt: profile.createdAt,
        privacyLevel: profile.privacyLevel,
        isOwner: false,
        stats: null, // completely hide statistics
      };
    }

    // Public / Friends Only
    const filteredStats: Record<string, any> = {
      currentLevel,
      friendsCount,
    };

    if (profile.showNotes) filteredStats.notesCount = notesCount;
    if (profile.showStreak) filteredStats.streak = streak;
    if (profile.showStudyHours) {
      filteredStats.studyHours = studyHours;
      filteredStats.focusSessionsCount = focusSessionsCount;
    }
    if (profile.showBadges) filteredStats.badgesCount = badgesCount;
    if (profile.showAchievements) {
      filteredStats.flashcardsCount = flashcardsCount;
      filteredStats.quizzesCompletedCount = quizzesCompletedCount;
      filteredStats.documentsCount = documentsCount;
      filteredStats.aiGenerationsCount = aiGenerationsCount;
    }

    return {
      userId: profile.userId,
      displayName:
        profile.displayName || `${profile.firstName} ${profile.lastName}`,
      username: profile.username ? `@${profile.username}` : null,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio,
      timezone: profile.timezone,
      createdAt: profile.createdAt,
      privacyLevel: profile.privacyLevel,
      isOwner: false,
      stats: filteredStats,
    };
  }

  // Helper calculation for consecutive focus session days
  private async calculateStreak(userId: string): Promise<number> {
    const sessions = await this.prisma.pomodoroSession.findMany({
      where: { userId, completed: true },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    if (sessions.length === 0) return 0;

    // Deduplicate calendar days in YYYY-MM-DD
    const days = Array.from(
      new Set(sessions.map((s) => s.createdAt.toISOString().split('T')[0])),
    );

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Check if user had a session today or yesterday to preserve streak
    const hasToday = days.includes(todayStr);
    const hasYesterday = days.includes(yesterdayStr);

    if (!hasToday && !hasYesterday) {
      return 0;
    }

    let streak = 0;
    const currentCheckDate = hasToday ? new Date() : yesterday;

    while (true) {
      const checkStr = currentCheckDate.toISOString().split('T')[0];
      if (days.includes(checkStr)) {
        streak++;
        // Move back 1 day
        currentCheckDate.setDate(currentCheckDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  // ==========================================
  // UPDATES
  // ==========================================

  async updateProfile(
    userId: string,
    dto: {
      displayName?: string;
      bio?: string;
      timezone?: string;
      institution?: string;
      degree?: string;
      department?: string;
      branch?: string;
      program?: string;
      campus?: string;
      admissionYear?: number;
      expectedGraduationYear?: number;
      currentSemester?: number;
      currentAcademicYear?: number;
      currentSession?: string;
      totalSemesters?: number;
      specializations?: string[];
    },
  ) {
    if (dto.displayName && dto.displayName.length > 50) {
      throw new BadRequestException(
        'Display name must not exceed 50 characters',
      );
    }
    if (dto.bio && dto.bio.length > 150) {
      throw new BadRequestException('Bio must not exceed 150 characters');
    }

    if (dto.currentSemester && dto.totalSemesters && dto.currentSemester > dto.totalSemesters) {
      throw new BadRequestException('Current semester cannot exceed total semesters');
    }

    if (dto.admissionYear && dto.expectedGraduationYear && dto.expectedGraduationYear < dto.admissionYear) {
      throw new BadRequestException('Expected graduation year cannot be before admission year');
    }

    return this.prisma.profile.update({
      where: { userId },
      data: {
        displayName: dto.displayName !== undefined ? dto.displayName : undefined,
        bio: dto.bio !== undefined ? dto.bio : undefined,
        timezone: dto.timezone !== undefined ? dto.timezone : undefined,
        institution: dto.institution !== undefined ? dto.institution : undefined,
        degree: dto.degree !== undefined ? dto.degree : undefined,
        department: dto.department !== undefined ? dto.department : undefined,
        branch: dto.branch !== undefined ? dto.branch : undefined,
        program: dto.program !== undefined ? dto.program : undefined,
        campus: dto.campus !== undefined ? dto.campus : undefined,
        admissionYear: dto.admissionYear !== undefined ? dto.admissionYear : undefined,
        expectedGraduationYear: dto.expectedGraduationYear !== undefined ? dto.expectedGraduationYear : undefined,
        currentSemester: dto.currentSemester !== undefined ? dto.currentSemester : undefined,
        currentAcademicYear: dto.currentAcademicYear !== undefined ? dto.currentAcademicYear : undefined,
        currentSession: dto.currentSession !== undefined ? dto.currentSession : undefined,
        totalSemesters: dto.totalSemesters !== undefined ? dto.totalSemesters : undefined,
        specializations: dto.specializations !== undefined ? dto.specializations : undefined,
      },
    });
  }

  async updateUsername(userId: string, username: string) {
    const cleanUsername = username.toLowerCase().trim().replace(/^@/, '');

    // Format Validation
    const regex = /^[a-z0-9_]+$/;
    if (!regex.test(cleanUsername)) {
      throw new BadRequestException(
        'Username can only contain lowercase letters, numbers, and underscores',
      );
    }

    if (this.reservedUsernames.includes(cleanUsername)) {
      throw new BadRequestException(
        'This username is reserved and cannot be selected',
      );
    }

    // 30 Days Check
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Profile not found');

    if (profile.usernameUpdatedAt) {
      const daysSinceUpdate =
        (Date.now() - profile.usernameUpdatedAt.getTime()) /
        (1000 * 60 * 60 * 24);
      if (daysSinceUpdate < 30) {
        const remainingDays = Math.ceil(30 - daysSinceUpdate);
        throw new BadRequestException(
          `Username can only be changed once every 30 days. Try again in ${remainingDays} days`,
        );
      }
    }

    // Uniqueness check
    const existing = await this.prisma.profile.findUnique({
      where: { username: cleanUsername },
    });
    if (existing && existing.userId !== userId) {
      throw new BadRequestException('Username is already taken');
    }

    return this.prisma.profile.update({
      where: { userId },
      data: {
        username: cleanUsername,
        usernameUpdatedAt: new Date(),
      },
    });
  }

  async checkUsernameAvailability(username: string) {
    const cleanUsername = username.toLowerCase().trim().replace(/^@/, '');
    const regex = /^[a-z0-9_]+$/;

    if (
      !regex.test(cleanUsername) ||
      this.reservedUsernames.includes(cleanUsername)
    ) {
      return {
        available: false,
        reason: 'Invalid or reserved username format',
      };
    }

    const existing = await this.prisma.profile.findUnique({
      where: { username: cleanUsername },
    });

    return {
      available: !existing,
      reason: existing ? 'Username already taken' : 'Username is available',
    };
  }

  async updatePrivacySettings(
    userId: string,
    dto: {
      privacyLevel?: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE';
      showStudyHours?: boolean;
      showStreak?: boolean;
      showBadges?: boolean;
      showNotes?: boolean;
      showAchievements?: boolean;
    },
  ) {
    return this.prisma.profile.update({
      where: { userId },
      data: {
        privacyLevel:
          dto.privacyLevel !== undefined ? dto.privacyLevel : undefined,
        showStudyHours:
          dto.showStudyHours !== undefined ? dto.showStudyHours : undefined,
        showStreak: dto.showStreak !== undefined ? dto.showStreak : undefined,
        showBadges: dto.showBadges !== undefined ? dto.showBadges : undefined,
        showNotes: dto.showNotes !== undefined ? dto.showNotes : undefined,
        showAchievements:
          dto.showAchievements !== undefined ? dto.showAchievements : undefined,
      },
    });
  }

  async selectBuiltInAvatar(userId: string, avatarUrl: string) {
    return this.prisma.profile.update({
      where: { userId },
      data: { avatarUrl },
    });
  }
}
