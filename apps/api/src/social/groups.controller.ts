import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('social/groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // GET INCOMING GROUP INVITES
  // ==========================================
  @Get('invites')
  async getInvites(@Request() req: any) {
    const userId = req.user.id;

    const list = await this.prisma.groupInvite.findMany({
      where: { inviteeId: userId, status: 'PENDING' },
      include: {
        group: true,
        inviter: { include: { profile: true } },
      },
    });

    return list.map((item) => ({
      id: item.id,
      studyGroupId: item.studyGroupId,
      groupName: item.group.name,
      inviterName:
        item.inviter.profile?.displayName ||
        item.inviter.profile?.firstName ||
        'someone',
      createdAt: item.createdAt,
    }));
  }

  // ==========================================
  // ACCEPT GROUP INVITE
  // ==========================================
  @Post('invites/:inviteId/accept')
  async acceptInvite(@Request() req: any, @Param('inviteId') inviteId: string) {
    const userId = req.user.id;

    const invite = await this.prisma.groupInvite.findUnique({
      where: { id: inviteId },
    });
    if (!invite || invite.inviteeId !== userId) {
      throw new NotFoundException('Invitation not found');
    }

    // Delete invite & join group
    await this.prisma.groupInvite.delete({ where: { id: inviteId } });

    const member = await this.prisma.studyGroupMember.create({
      data: {
        studyGroupId: invite.studyGroupId,
        userId,
        role: 'MEMBER',
      },
    });

    return member;
  }

  // ==========================================
  // REJECT GROUP INVITE
  // ==========================================
  @Post('invites/:inviteId/reject')
  async rejectInvite(@Request() req: any, @Param('inviteId') inviteId: string) {
    const userId = req.user.id;

    const invite = await this.prisma.groupInvite.findUnique({
      where: { id: inviteId },
    });
    if (!invite || invite.inviteeId !== userId) {
      throw new NotFoundException('Invitation not found');
    }

    await this.prisma.groupInvite.delete({ where: { id: inviteId } });
    return { success: true };
  }

  // ==========================================
  // LIST GROUPS
  // ==========================================
  @Get()
  async getGroups(@Request() req: any) {
    const userId = req.user.id;

    const memberships = await this.prisma.studyGroupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            members: { include: { user: { include: { profile: true } } } },
          },
        },
      },
    });

    return memberships.map((m) => m.group);
  }

  // ==========================================
  // CREATE STUDY GROUP
  // ==========================================
  @Post()
  async createGroup(
    @Request() req: any,
    @Body() body: { name: string; description?: string },
  ) {
    const userId = req.user.id;
    if (!body.name?.trim()) {
      throw new BadRequestException('Group name required');
    }

    const group = await this.prisma.studyGroup.create({
      data: {
        name: body.name.trim(),
        description: body.description,
        ownerId: userId,
      },
    });

    // Add owner as a member
    await this.prisma.studyGroupMember.create({
      data: {
        studyGroupId: group.id,
        userId,
        role: 'OWNER',
      },
    });

    return group;
  }

  // ==========================================
  // GET GROUP DASHBOARD STATS & DETAILS
  // ==========================================
  @Get(':id')
  async getGroupDetails(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.id;

    // Verify membership
    const memberRecord = await this.prisma.studyGroupMember.findUnique({
      where: { studyGroupId_userId: { studyGroupId: id, userId } },
    });
    if (!memberRecord) {
      throw new ForbiddenException('Not a member of this study group');
    }

    const group = await this.prisma.studyGroup.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              include: {
                profile: true,
                pomodoroSessions: {
                  where: {
                    createdAt: {
                      gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // last 7 days
                    },
                  },
                },
                xpLogs: {
                  where: {
                    createdAt: {
                      gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                    },
                  },
                },
              },
            },
          },
        },
        announcements: {
          orderBy: { createdAt: 'desc' },
          include: { author: { include: { profile: true } } },
          take: 5,
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Study group not found');
    }

    // Compute weekly study hours for members
    const weeklyStudyHours = group.members.reduce((acc, m) => {
      const minutes = m.user.pomodoroSessions.reduce(
        (sum, s) => sum + s.durationMinutes,
        0,
      );
      return acc + minutes / 60.0;
    }, 0);

    // Group-specific weekly leaderboard standings
    const leaderboard = group.members
      .map((m) => {
        const xp = m.user.xpLogs.reduce((sum, log) => sum + log.amount, 0);
        const hours =
          m.user.pomodoroSessions.reduce(
            (sum, s) => sum + s.durationMinutes,
            0,
          ) / 60.0;
        return {
          userId: m.userId,
          username: m.user.profile?.username || 'learner',
          displayName:
            m.user.profile?.displayName ||
            m.user.profile?.firstName ||
            'Learner',
          avatarUrl: m.user.profile?.avatarUrl || '',
          xp,
          studyHours: hours,
          level: m.user.profile?.level || 1,
          role: m.role,
        };
      })
      .sort((a, b) => b.xp - a.xp);

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      ownerId: group.ownerId,
      createdAt: group.createdAt,
      membersCount: group.members.length,
      weeklyStudyHours,
      announcements: group.announcements,
      leaderboard,
      myRole: memberRecord.role,
    };
  }

  // ==========================================
  // EDIT GROUP / TRANSFER OWNERSHIP
  // ==========================================
  @Patch(':id')
  async editGroup(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    body: { name?: string; description?: string; transferOwnerId?: string },
  ) {
    const userId = req.user.id;

    const group = await this.prisma.studyGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.ownerId !== userId) {
      throw new ForbiddenException('Only owners can modify settings');
    }

    if (body.transferOwnerId) {
      const targetMember = await this.prisma.studyGroupMember.findUnique({
        where: {
          studyGroupId_userId: {
            studyGroupId: id,
            userId: body.transferOwnerId,
          },
        },
      });
      if (!targetMember) {
        throw new BadRequestException('Target is not a member of the group');
      }

      await this.prisma.$transaction([
        this.prisma.studyGroup.update({
          where: { id },
          data: { ownerId: body.transferOwnerId },
        }),
        this.prisma.studyGroupMember.update({
          where: {
            studyGroupId_userId: {
              studyGroupId: id,
              userId: body.transferOwnerId,
            },
          },
          data: { role: 'OWNER' },
        }),
        this.prisma.studyGroupMember.update({
          where: { studyGroupId_userId: { studyGroupId: id, userId } },
          data: { role: 'ADMIN' },
        }),
      ]);

      return { success: true, message: 'Ownership transferred' };
    }

    return this.prisma.studyGroup.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name.trim() : undefined,
        description:
          body.description !== undefined ? body.description : undefined,
      },
    });
  }

  // ==========================================
  // INVITE FRIENDS
  // ==========================================
  @Post(':id/invite')
  async inviteFriend(
    @Request() req: any,
    @Param('id') id: string,
    @Query('friendId') friendId: string,
  ) {
    const inviterId = req.user.id;

    // Blocker check
    const block = await this.prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: inviterId, blockedId: friendId },
          { blockerId: friendId, blockedId: inviterId },
        ],
      },
    });
    if (block) throw new ForbiddenException('Blocked interactions restricted');

    // Verify inviter is in group
    const inviter = await this.prisma.studyGroupMember.findUnique({
      where: { studyGroupId_userId: { studyGroupId: id, userId: inviterId } },
    });
    if (!inviter) throw new ForbiddenException('Not a member of this group');

    // Check if friend is already in group
    const alreadyMember = await this.prisma.studyGroupMember.findUnique({
      where: { studyGroupId_userId: { studyGroupId: id, userId: friendId } },
    });
    if (alreadyMember) throw new BadRequestException('Already a member');

    // Check if invite exists
    const existing = await this.prisma.groupInvite.findUnique({
      where: {
        studyGroupId_inviteeId: { studyGroupId: id, inviteeId: friendId },
      },
    });
    if (existing) return existing;

    const newInvite = await this.prisma.groupInvite.create({
      data: {
        studyGroupId: id,
        inviterId,
        inviteeId: friendId,
      },
    });

    const group = await this.prisma.studyGroup.findUnique({ where: { id } });
    await this.prisma.notification.create({
      data: {
        userId: friendId,
        title: 'Group Invitation',
        message: `You were invited to join "${group?.name || 'a group'}".`,
        type: 'GROUP_INVITE',
      },
    });

    return newInvite;
  }

  // ==========================================
  // LEAVE GROUP
  // ==========================================
  @Post(':id/leave')
  async leaveGroup(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.id;

    const member = await this.prisma.studyGroupMember.findUnique({
      where: { studyGroupId_userId: { studyGroupId: id, userId } },
    });
    if (!member) throw new BadRequestException('Not a member');
    if (member.role === 'OWNER') {
      throw new BadRequestException(
        'Owners must transfer ownership before leaving',
      );
    }

    await this.prisma.studyGroupMember.delete({
      where: { studyGroupId_userId: { studyGroupId: id, userId } },
    });

    return { success: true };
  }

  // ==========================================
  // KICK MEMBER
  // ==========================================
  @Post(':id/kick/:targetId')
  async kickMember(
    @Request() req: any,
    @Param('id') id: string,
    @Param('targetId') targetId: string,
  ) {
    const callerId = req.user.id;

    const caller = await this.prisma.studyGroupMember.findUnique({
      where: { studyGroupId_userId: { studyGroupId: id, userId: callerId } },
    });
    const target = await this.prisma.studyGroupMember.findUnique({
      where: { studyGroupId_userId: { studyGroupId: id, userId: targetId } },
    });

    if (!caller || !target)
      throw new BadRequestException('Invalid member values');

    // Role permissions check
    const callerIsAdmin = caller.role === 'OWNER' || caller.role === 'ADMIN';
    const targetIsOwnerOrAdmin =
      target.role === 'OWNER' ||
      (target.role === 'ADMIN' && caller.role !== 'OWNER');

    if (!callerIsAdmin || targetIsOwnerOrAdmin) {
      throw new ForbiddenException('Insufficient permissions');
    }

    await this.prisma.studyGroupMember.delete({
      where: { studyGroupId_userId: { studyGroupId: id, userId: targetId } },
    });

    return { success: true };
  }

  // ==========================================
  // UPDATE MEMBER ROLE
  // ==========================================
  @Post(':id/role')
  async updateRole(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { targetUserId: string; role: 'ADMIN' | 'MEMBER' },
  ) {
    const callerId = req.user.id;

    const group = await this.prisma.studyGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.ownerId !== callerId) {
      throw new ForbiddenException('Only owners can manage roles');
    }

    await this.prisma.studyGroupMember.update({
      where: {
        studyGroupId_userId: { studyGroupId: id, userId: body.targetUserId },
      },
      data: { role: body.role },
    });

    return { success: true };
  }

  // ==========================================
  // GROUP ANNOUNCEMENTS Bulletins
  // ==========================================
  @Get(':id/announcements')
  async getAnnouncements(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.id;

    const member = await this.prisma.studyGroupMember.findUnique({
      where: { studyGroupId_userId: { studyGroupId: id, userId } },
    });
    if (!member) throw new ForbiddenException('Not a member');

    return this.prisma.groupAnnouncement.findMany({
      where: { studyGroupId: id },
      orderBy: { createdAt: 'desc' },
      include: { author: { include: { profile: true } } },
    });
  }

  @Post(':id/announcements')
  async postAnnouncement(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { title: string; content: string },
  ) {
    const userId = req.user.id;
    if (!body.title?.trim() || !body.content?.trim()) {
      throw new BadRequestException('Title and content are required');
    }

    const member = await this.prisma.studyGroupMember.findUnique({
      where: { studyGroupId_userId: { studyGroupId: id, userId } },
    });
    if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
      throw new ForbiddenException(
        'Only owners and admins can post announcements',
      );
    }

    return this.prisma.groupAnnouncement.create({
      data: {
        studyGroupId: id,
        authorId: userId,
        title: body.title.trim(),
        content: body.content.trim(),
      },
    });
  }

  // ==========================================
  // SHARED RESOURCES (Notes, Flashcards, etc.)
  // ==========================================
  @Get(':id/resources')
  async getResources(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.id;

    const member = await this.prisma.studyGroupMember.findUnique({
      where: { studyGroupId_userId: { studyGroupId: id, userId } },
    });
    if (!member) throw new ForbiddenException('Not a member');

    const list = await this.prisma.groupResource.findMany({
      where: { studyGroupId: id },
      include: { sharedBy: { include: { profile: true } } },
    });

    // Populate actual items from DB
    const populated = [];
    for (const item of list) {
      let details: any = null;
      try {
        if (item.resourceType === 'NOTE') {
          details = await this.prisma.note.findUnique({
            where: { id: item.resourceId },
          });
        } else if (item.resourceType === 'FLASHCARD_DECK') {
          details = await this.prisma.flashcardDeck.findUnique({
            where: { id: item.resourceId },
          });
        } else if (item.resourceType === 'QUIZ') {
          details = await this.prisma.quiz.findUnique({
            where: { id: item.resourceId },
          });
        } else if (item.resourceType === 'TASK') {
          details = await this.prisma.task.findUnique({
            where: { id: item.resourceId },
          });
        } else if (item.resourceType === 'CALENDAR_EVENT') {
          details = await this.prisma.calendarEvent.findUnique({
            where: { id: item.resourceId },
          });
        }
      } catch (err) {
        // Ignored
      }

      if (details) {
        populated.push({
          ...item,
          details,
        });
      }
    }

    return populated;
  }

  @Post(':id/resources')
  async shareResource(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { resourceType: string; resourceId: string },
  ) {
    const userId = req.user.id;

    const member = await this.prisma.studyGroupMember.findUnique({
      where: { studyGroupId_userId: { studyGroupId: id, userId } },
    });
    if (!member) throw new ForbiddenException('Not a member');

    const existing = await this.prisma.groupResource.findUnique({
      where: {
        studyGroupId_resourceType_resourceId: {
          studyGroupId: id,
          resourceType: body.resourceType,
          resourceId: body.resourceId,
        },
      },
    });
    if (existing) return existing;

    return this.prisma.groupResource.create({
      data: {
        studyGroupId: id,
        resourceType: body.resourceType,
        resourceId: body.resourceId,
        sharedById: userId,
      },
    });
  }

  @Delete(':id/resources/:resourceId')
  async unshareResource(
    @Request() req: any,
    @Param('id') id: string,
    @Param('resourceId') resourceId: string,
  ) {
    const userId = req.user.id;

    const resource = await this.prisma.groupResource.findFirst({
      where: { studyGroupId: id, resourceId },
    });
    if (!resource) throw new NotFoundException('Resource not found');

    const member = await this.prisma.studyGroupMember.findUnique({
      where: { studyGroupId_userId: { studyGroupId: id, userId } },
    });

    const isSharedByMe = resource.sharedById === userId;
    const isGroupManager =
      member && (member.role === 'OWNER' || member.role === 'ADMIN');

    if (!isSharedByMe && !isGroupManager) {
      throw new ForbiddenException('Unauthorized removal');
    }

    await this.prisma.groupResource.delete({
      where: { id: resource.id },
    });

    return { success: true };
  }
}
