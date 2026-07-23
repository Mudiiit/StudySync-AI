import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { StatusService } from './status.service';

function calculateStreakFromSessions(sessions: any[]): number {
  if (!sessions || sessions.length === 0) return 0;
  const days = Array.from(
    new Set(
      sessions.map((s) =>
        s.createdAt ? s.createdAt.toISOString().split('T')[0] : '',
      ),
    ),
  );
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const hasToday = days.includes(todayStr);
  const hasYesterday = days.includes(yesterdayStr);
  if (!hasToday && !hasYesterday) return 0;

  let streak = 0;
  const check = hasToday ? new Date() : yesterday;
  while (true) {
    const checkStr = check.toISOString().split('T')[0];
    if (days.includes(checkStr)) {
      streak++;
      check.setDate(check.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

@Controller('social')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly statusService: StatusService,
  ) {}

  // ==========================================
  // SEARCH USERS
  // ==========================================
  @Get('users/search')
  async searchUsers(@Request() req: any, @Query('q') query: string) {
    const userId = req.user.id;
    const q = (query || '').trim().toLowerCase();
    if (!q) return [];

    // Find blocks involving the user
    const blocks = await this.prisma.userBlock.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
    });
    const blockedIds = blocks.map((b) =>
      b.blockerId === userId ? b.blockedId : b.blockerId,
    );

    const users = await this.prisma.user.findMany({
      where: {
        id: { notIn: [userId, ...blockedIds] },
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { profile: { username: { contains: q, mode: 'insensitive' } } },
          { profile: { displayName: { contains: q, mode: 'insensitive' } } },
        ],
      },
      include: {
        profile: true,
        sentFriendRequests: { where: { receiverId: userId } },
        receivedFriendRequests: { where: { senderId: userId } },
        friendshipsInitiated: { where: { friendId: userId } },
        friendshipsReceived: { where: { userId: userId } },
        pomodoroSessions: { where: { completed: true } },
      },
      take: 20,
    });

    return users.map((u) => {
      const p = u.profile;
      let relationship = 'NONE';
      if (
        u.friendshipsInitiated.length > 0 ||
        u.friendshipsReceived.length > 0
      ) {
        relationship = 'FRIEND';
      } else if (u.sentFriendRequests.length > 0) {
        relationship = 'RECEIVED'; // Request received from u
      } else if (u.receivedFriendRequests.length > 0) {
        relationship = 'SENT'; // Request sent to u
      }

      const streak = calculateStreakFromSessions(u.pomodoroSessions);

      // Generate deterministic academic info based on user ID
      const code = u.id.charCodeAt(0) + u.id.charCodeAt(u.id.length - 1);
      const universities = [
        'Stanford University',
        'MIT',
        'Harvard University',
        'UC Berkeley',
        'Delhi University',
        'IIT Bombay',
      ];
      const departments = [
        'Computer Science',
        'Electrical Engineering',
        'Mechanical Engineering',
        'Mathematics',
        'Physics',
        'Chemistry',
      ];
      const courses = [
        'Intro to Algorithms',
        'Artificial Intelligence',
        'Linear Algebra',
        'Quantum Mechanics',
        'Data Structures',
      ];
      const skillsPool = [
        'React',
        'NestJS',
        'TypeScript',
        'Machine Learning',
        'Python',
        'Algorithms',
        'System Design',
      ];
      const interestsPool = [
        'Competitive Programming',
        'AI Safety',
        'UI Design',
        'Pomodoro Sessions',
        'Web Development',
      ];

      const university = universities[code % universities.length];
      const department = departments[code % departments.length];
      const course = courses[code % courses.length];
      const skills = [
        skillsPool[code % skillsPool.length],
        skillsPool[(code + 3) % skillsPool.length],
      ];
      const interests = [
        interestsPool[code % interestsPool.length],
        interestsPool[(code + 2) % interestsPool.length],
      ];

      return {
        id: u.id,
        avatarUrl: p?.avatarUrl || '',
        username: p?.username || 'learner',
        displayName: p?.displayName || p?.firstName || 'Learner',
        level: p?.level || 1,
        streak,
        weeklyRank: p?.weeklyRank || 0,
        status: p?.status || 'OFFLINE',
        relationship,
        university,
        department,
        course,
        skills,
        interests,
      };
    });
  }

  // ==========================================
  // GET FRIENDS
  // ==========================================
  @Get('friends')
  async getFriends(@Request() req: any) {
    const userId = req.user.id;

    // Refresh heartbeat
    await this.statusService.updateHeartbeat(userId, 'ONLINE');

    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [{ userId }, { friendId: userId }],
      },
      include: {
        user: {
          include: {
            profile: true,
            pomodoroSessions: { where: { completed: true } },
          },
        },
        friend: {
          include: {
            profile: true,
            pomodoroSessions: { where: { completed: true } },
          },
        },
      },
    });

    return friendships.map((f) => {
      const buddy = f.userId === userId ? f.friend : f.user;
      const p = buddy.profile;
      const streak = calculateStreakFromSessions(buddy.pomodoroSessions);

      // Generate deterministic academic info based on buddy ID
      const code =
        buddy.id.charCodeAt(0) + buddy.id.charCodeAt(buddy.id.length - 1);
      const universities = [
        'Stanford University',
        'MIT',
        'Harvard University',
        'UC Berkeley',
        'Delhi University',
        'IIT Bombay',
      ];
      const departments = [
        'Computer Science',
        'Electrical Engineering',
        'Mechanical Engineering',
        'Mathematics',
        'Physics',
        'Chemistry',
      ];
      const courses = [
        'Intro to Algorithms',
        'Artificial Intelligence',
        'Linear Algebra',
        'Quantum Mechanics',
        'Data Structures',
      ];
      const skillsPool = [
        'React',
        'NestJS',
        'TypeScript',
        'Machine Learning',
        'Python',
        'Algorithms',
        'System Design',
      ];
      const interestsPool = [
        'Competitive Programming',
        'AI Safety',
        'UI Design',
        'Pomodoro Sessions',
        'Web Development',
      ];

      const university = universities[code % universities.length];
      const department = departments[code % departments.length];
      const course = courses[code % courses.length];
      const skills = [
        skillsPool[code % skillsPool.length],
        skillsPool[(code + 3) % skillsPool.length],
      ];
      const interests = [
        interestsPool[code % interestsPool.length],
        interestsPool[(code + 2) % interestsPool.length],
      ];

      return {
        id: buddy.id,
        avatarUrl: p?.avatarUrl || '',
        username: p?.username || 'learner',
        displayName: p?.displayName || p?.firstName || 'Learner',
        level: p?.level || 1,
        streak,
        weeklyRank: p?.weeklyRank || 0,
        status: p?.status || 'OFFLINE',
        university,
        department,
        course,
        skills,
        interests,
      };
    });
  }

  // ==========================================
  // GET PENDING REQUESTS
  // ==========================================
  @Get('friends/requests')
  async getRequests(@Request() req: any) {
    const userId = req.user.id;

    const incoming = await this.prisma.friendRequest.findMany({
      where: { receiverId: userId, status: 'PENDING' },
      include: { sender: { include: { profile: true } } },
    });

    const outgoing = await this.prisma.friendRequest.findMany({
      where: { senderId: userId, status: 'PENDING' },
      include: { receiver: { include: { profile: true } } },
    });

    return {
      incoming: incoming.map((r) => ({
        id: r.id,
        senderId: r.senderId,
        avatarUrl: r.sender.profile?.avatarUrl || '',
        username: r.sender.profile?.username || 'learner',
        displayName:
          r.sender.profile?.displayName ||
          r.sender.profile?.firstName ||
          'Learner',
        level: r.sender.profile?.level || 1,
        createdAt: r.createdAt,
      })),
      outgoing: outgoing.map((r) => ({
        id: r.id,
        receiverId: r.receiverId,
        avatarUrl: r.receiver.profile?.avatarUrl || '',
        username: r.receiver.profile?.username || 'learner',
        displayName:
          r.receiver.profile?.displayName ||
          r.receiver.profile?.firstName ||
          'Learner',
        level: r.receiver.profile?.level || 1,
        createdAt: r.createdAt,
      })),
    };
  }

  // ==========================================
  // SEND FRIEND REQUEST
  // ==========================================
  @Post('friends/request')
  async sendRequest(
    @Request() req: any,
    @Query('receiverId') receiverId: string,
  ) {
    const senderId = req.user.id;
    if (senderId === receiverId) {
      throw new BadRequestException('Cannot request yourself');
    }

    // Security Block checks
    const block = await this.prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: senderId, blockedId: receiverId },
          { blockerId: receiverId, blockedId: senderId },
        ],
      },
    });
    if (block) {
      throw new BadRequestException('Blocked interactions restricted');
    }

    // Check if already friends
    const existingFriend = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: senderId, friendId: receiverId },
          { userId: receiverId, friendId: senderId },
        ],
      },
    });
    if (existingFriend) {
      throw new BadRequestException('Already friends');
    }

    // Check duplicate requests
    const existingReq = await this.prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      },
    });
    if (existingReq) {
      throw new BadRequestException('Friend request already exists');
    }

    const newReq = await this.prisma.friendRequest.create({
      data: { senderId, receiverId },
    });

    // Notify receiver
    const senderProfile = await this.prisma.profile.findUnique({
      where: { userId: senderId },
    });
    await this.prisma.notification.create({
      data: {
        userId: receiverId,
        title: 'New Friend Request',
        message: `@${senderProfile?.username || 'someone'} sent you a friend request.`,
        type: 'FRIEND_REQUEST',
      },
    });

    return newReq;
  }

  // ==========================================
  // ACCEPT FRIEND REQUEST
  // ==========================================
  @Post('friends/accept/:id')
  async acceptRequest(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.id;

    const request = await this.prisma.friendRequest.findUnique({
      where: { id },
    });
    if (!request || request.receiverId !== userId) {
      throw new NotFoundException('Friend request not found');
    }

    // Delete request & create friendship
    await this.prisma.friendRequest.delete({ where: { id } });

    const friendship = await this.prisma.friendship.create({
      data: {
        userId: request.senderId,
        friendId: request.receiverId,
      },
    });

    // Notify sender
    const receiverProfile = await this.prisma.profile.findUnique({
      where: { userId },
    });
    await this.prisma.notification.create({
      data: {
        userId: request.senderId,
        title: 'Friend Request Accepted',
        message: `@${receiverProfile?.username || 'someone'} accepted your friend request!`,
        type: 'FRIEND_REQUEST',
      },
    });

    return friendship;
  }

  // ==========================================
  // REJECT FRIEND REQUEST
  // ==========================================
  @Post('friends/reject/:id')
  async rejectRequest(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.id;

    const request = await this.prisma.friendRequest.findUnique({
      where: { id },
    });
    if (!request || request.receiverId !== userId) {
      throw new NotFoundException('Friend request not found');
    }

    await this.prisma.friendRequest.delete({ where: { id } });
    return { success: true };
  }

  // ==========================================
  // REMOVE FRIEND
  // ==========================================
  @Delete('friends/:friendId')
  async removeFriend(@Request() req: any, @Param('friendId') friendId: string) {
    const userId = req.user.id;

    await this.prisma.friendship.deleteMany({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    });

    return { success: true };
  }

  // ==========================================
  // BLOCK USER
  // ==========================================
  @Post('friends/block/:blockedId')
  async blockUser(@Request() req: any, @Param('blockedId') blockedId: string) {
    const blockerId = req.user.id;
    if (blockerId === blockedId) {
      throw new BadRequestException('Cannot block yourself');
    }

    // Check if block already exists
    const existingBlock = await this.prisma.userBlock.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });
    if (existingBlock) {
      return existingBlock;
    }

    // Break any existing friendships or requests
    await this.prisma.friendship.deleteMany({
      where: {
        OR: [
          { userId: blockerId, friendId: blockedId },
          { userId: blockedId, friendId: blockerId },
        ],
      },
    });

    await this.prisma.friendRequest.deleteMany({
      where: {
        OR: [
          { senderId: blockerId, receiverId: blockedId },
          { senderId: blockedId, receiverId: blockerId },
        ],
      },
    });

    return this.prisma.userBlock.create({
      data: { blockerId, blockedId },
    });
  }

  // ==========================================
  // UNBLOCK USER
  // ==========================================
  @Post('friends/unblock/:blockedId')
  async unblockUser(
    @Request() req: any,
    @Param('blockedId') blockedId: string,
  ) {
    const blockerId = req.user.id;

    await this.prisma.userBlock.deleteMany({
      where: { blockerId, blockedId },
    });

    return { success: true };
  }

  // ==========================================
  // LIST BLOCKED USERS
  // ==========================================
  @Get('friends/blocks')
  async getBlocks(@Request() req: any) {
    const blockerId = req.user.id;

    const list = await this.prisma.userBlock.findMany({
      where: { blockerId },
      include: { blocked: { include: { profile: true } } },
    });

    return list.map((b) => ({
      id: b.blockedId,
      username: b.blocked.profile?.username || 'learner',
      displayName:
        b.blocked.profile?.displayName ||
        b.blocked.profile?.firstName ||
        'Learner',
      avatarUrl: b.blocked.profile?.avatarUrl || '',
    }));
  }

  // ==========================================
  // ACTIVE HEARTBEAT UPDATE ROUTE
  // ==========================================
  @Post('status/heartbeat')
  async heartbeat(@Request() req: any, @Query('status') status: string) {
    const userId = req.user.id;
    await this.statusService.updateHeartbeat(userId, status);
    return { success: true };
  }
}
