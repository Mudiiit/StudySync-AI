import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class WorkspaceService {
  constructor(private prisma: PrismaService) {}

  async createGroup(userId: string, name: string, description?: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Create group
      const group = await tx.studyGroup.create({
        data: {
          name,
          description,
          ownerId: userId,
        },
      });

      // 2. Add owner as member
      await tx.studyGroupMember.create({
        data: {
          studyGroupId: group.id,
          userId,
          role: 'OWNER',
        },
      });

      return group;
    });
  }

  async inviteMember(
    inviterId: string,
    studyGroupId: string,
    targetEmail: string,
  ) {
    // 1. Verify inviter is owner/admin
    const member = await this.prisma.studyGroupMember.findUnique({
      where: { studyGroupId_userId: { studyGroupId, userId: inviterId } },
    });
    if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
      throw new BadRequestException(
        'Only workspace owners or admins can invite new members.',
      );
    }

    // 2. Generate secure token
    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expire in 7 days

    return this.prisma.groupInvitation.create({
      data: {
        studyGroupId,
        email: targetEmail,
        token,
        expiresAt,
      },
    });
  }

  async acceptInvitation(userId: string, token: string) {
    const invite = await this.prisma.groupInvitation.findUnique({
      where: { token },
    });
    if (!invite) {
      throw new NotFoundException(
        'Invitation token is invalid or has expired.',
      );
    }

    if (invite.expiresAt < new Date()) {
      await this.prisma.groupInvitation.delete({ where: { token } });
      throw new BadRequestException('Invitation has expired.');
    }

    // Add user as member
    return this.prisma.$transaction(async (tx) => {
      const member = await tx.studyGroupMember.create({
        data: {
          studyGroupId: invite.studyGroupId,
          userId,
          role: invite.role,
        },
      });

      // Remove invitation
      await tx.groupInvitation.delete({ where: { token } });

      return member;
    });
  }

  async listGroupMembers(studyGroupId: string) {
    return this.prisma.studyGroupMember.findMany({
      where: { studyGroupId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  async listUserGroups(userId: string) {
    const memberships = await this.prisma.studyGroupMember.findMany({
      where: { userId },
      include: {
        group: true,
      },
    });
    return memberships.map((m) => m.group);
  }

  async renameGroup(
    userId: string,
    groupId: string,
    name: string,
    description?: string,
  ) {
    const group = await this.prisma.studyGroup.findUnique({
      where: { id: groupId },
    });
    if (!group) throw new NotFoundException('Workspace not found');
    if (group.ownerId !== userId) {
      throw new BadRequestException('Only the owner can rename the workspace');
    }
    return this.prisma.studyGroup.update({
      where: { id: groupId },
      data: { name: name.trim(), description },
    });
  }

  async deleteGroup(userId: string, groupId: string) {
    const group = await this.prisma.studyGroup.findUnique({
      where: { id: groupId },
    });
    if (!group) throw new NotFoundException('Workspace not found');
    if (group.ownerId !== userId) {
      throw new BadRequestException('Only the owner can delete the workspace');
    }

    // Delete whiteboard save file if it exists on disk
    const whiteboardFilePath = path.join(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      'storage',
      'whiteboards',
      `${groupId}.json`,
    );
    if (fs.existsSync(whiteboardFilePath)) {
      try {
        fs.unlinkSync(whiteboardFilePath);
      } catch (e) {
        // ignore error if file cannot be unlinked
      }
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. Delete group resources
      await tx.groupResource.deleteMany({ where: { studyGroupId: groupId } });
      // 2. Delete group invites
      await tx.groupInvite.deleteMany({ where: { studyGroupId: groupId } });
      // 3. Delete group invitations (GroupInvitation)
      await tx.groupInvitation.deleteMany({ where: { studyGroupId: groupId } });
      // 4. Delete group announcements
      await tx.groupAnnouncement.deleteMany({
        where: { studyGroupId: groupId },
      });
      // 5. Delete group challenges
      await tx.groupChallenge.deleteMany({ where: { studyGroupId: groupId } });
      // 6. Delete group messages
      await tx.studyGroupMessage.deleteMany({
        where: { studyGroupId: groupId },
      });
      // 7. Delete group members
      await tx.studyGroupMember.deleteMany({
        where: { studyGroupId: groupId },
      });
      // 8. Finally delete the study group itself
      await tx.studyGroup.delete({ where: { id: groupId } });
    });

    return { success: true };
  }

  async leaveGroup(userId: string, groupId: string) {
    const group = await this.prisma.studyGroup.findUnique({
      where: { id: groupId },
    });
    if (!group) throw new NotFoundException('Workspace not found');
    if (group.ownerId === userId) {
      throw new BadRequestException(
        'Owner cannot leave the workspace. Transfer ownership or delete it instead.',
      );
    }
    const member = await this.prisma.studyGroupMember.findUnique({
      where: { studyGroupId_userId: { studyGroupId: groupId, userId } },
    });
    if (!member)
      throw new NotFoundException('You are not a member of this workspace');

    await this.prisma.studyGroupMember.delete({
      where: { studyGroupId_userId: { studyGroupId: groupId, userId } },
    });
    return { success: true };
  }

  async getUserInvitations(userId: string) {
    return this.prisma.groupInvite.findMany({
      where: { inviteeId: userId, status: 'PENDING' },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        inviter: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true,
                username: true,
              },
            },
          },
        },
      },
    });
  }

  async getGroupInvitations(groupId: string) {
    return this.prisma.groupInvite.findMany({
      where: { studyGroupId: groupId },
      include: {
        invitee: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true,
                username: true,
              },
            },
          },
        },
      },
    });
  }

  async createGroupInvite(
    inviterId: string,
    groupId: string,
    payload: { inviteeId?: string; email?: string; username?: string },
  ) {
    const member = await this.prisma.studyGroupMember.findUnique({
      where: {
        studyGroupId_userId: { studyGroupId: groupId, userId: inviterId },
      },
    });
    if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
      throw new BadRequestException(
        'Only workspace owners or admins can invite new members.',
      );
    }

    let targetUserId = payload.inviteeId;

    if (!targetUserId) {
      if (payload.email) {
        const u = await this.prisma.user.findUnique({
          where: { email: payload.email.trim() },
        });
        if (!u) throw new NotFoundException('User with this email not found');
        targetUserId = u.id;
      } else if (payload.username) {
        const profile = await this.prisma.profile.findFirst({
          where: {
            username: { equals: payload.username.trim(), mode: 'insensitive' },
          },
        });
        if (!profile)
          throw new NotFoundException('User with this username not found');
        targetUserId = profile.userId;
      }
    }

    if (!targetUserId) {
      throw new BadRequestException(
        'Please specify a username, email, or user ID to invite',
      );
    }

    if (targetUserId === inviterId) {
      throw new BadRequestException(
        'You cannot invite yourself to this workspace.',
      );
    }

    const targetMember = await this.prisma.studyGroupMember.findUnique({
      where: {
        studyGroupId_userId: { studyGroupId: groupId, userId: targetUserId },
      },
    });
    if (targetMember) {
      throw new BadRequestException(
        'User is already a member of this workspace',
      );
    }

    const existingInvite = await this.prisma.groupInvite.findUnique({
      where: {
        studyGroupId_inviteeId: {
          studyGroupId: groupId,
          inviteeId: targetUserId,
        },
      },
    });

    let invite;
    if (existingInvite) {
      if (existingInvite.status === 'PENDING') {
        invite = existingInvite;
      } else {
        invite = await this.prisma.groupInvite.update({
          where: { id: existingInvite.id },
          data: { status: 'PENDING' },
        });
      }
    } else {
      invite = await this.prisma.groupInvite.create({
        data: {
          studyGroupId: groupId,
          inviterId,
          inviteeId: targetUserId,
          status: 'PENDING',
        },
      });
    }

    try {
      const inviterUser = await this.prisma.user.findUnique({
        where: { id: inviterId },
        include: { profile: true },
      });
      const inviterName =
        inviterUser?.profile?.username ||
        inviterUser?.email.split('@')[0] ||
        'Someone';
      const group = await this.prisma.studyGroup.findUnique({
        where: { id: groupId },
      });

      await this.prisma.notification.create({
        data: {
          userId: targetUserId,
          title: 'Workspace Invitation',
          message: `${inviterName} has invited you to join the workspace "${group?.name}".`,
          type: 'WORKSPACE_INVITE',
          isRead: false,
        },
      });
    } catch (err) {
      console.error('Failed to create workspace invite notification:', err);
    }

    return invite;
  }

  async respondToGroupInvite(
    userId: string,
    inviteId: string,
    accept: boolean,
  ) {
    const invite = await this.prisma.groupInvite.findUnique({
      where: { id: inviteId },
    });
    if (!invite) throw new NotFoundException('Invitation not found');
    if (invite.inviteeId !== userId) {
      throw new BadRequestException(
        'This invitation was sent to a different user',
      );
    }

    if (accept) {
      await this.prisma.$transaction(async (tx) => {
        await tx.groupInvite.update({
          where: { id: inviteId },
          data: { status: 'ACCEPTED' },
        });
        await tx.studyGroupMember.create({
          data: {
            studyGroupId: invite.studyGroupId,
            userId,
            role: 'MEMBER',
          },
        });
      });
    } else {
      await this.prisma.groupInvite.update({
        where: { id: inviteId },
        data: { status: 'DECLINED' },
      });
    }

    return { success: true };
  }

  async removeMember(
    ownerOrAdminId: string,
    groupId: string,
    targetUserId: string,
  ) {
    const actor = await this.prisma.studyGroupMember.findUnique({
      where: {
        studyGroupId_userId: { studyGroupId: groupId, userId: ownerOrAdminId },
      },
    });
    if (!actor || (actor.role !== 'OWNER' && actor.role !== 'ADMIN')) {
      throw new BadRequestException(
        'Only workspace owners or admins can remove members.',
      );
    }

    const target = await this.prisma.studyGroupMember.findUnique({
      where: {
        studyGroupId_userId: { studyGroupId: groupId, userId: targetUserId },
      },
    });
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === 'OWNER') {
      throw new BadRequestException('Cannot remove the owner of the workspace');
    }

    if (actor.role === 'ADMIN' && target.role === 'ADMIN') {
      throw new BadRequestException('Admins cannot remove other admins');
    }

    await this.prisma.studyGroupMember.delete({
      where: {
        studyGroupId_userId: { studyGroupId: groupId, userId: targetUserId },
      },
    });
    return { success: true };
  }

  async updateMemberRole(
    ownerId: string,
    groupId: string,
    targetUserId: string,
    role: string,
  ) {
    const owner = await this.prisma.studyGroupMember.findUnique({
      where: {
        studyGroupId_userId: { studyGroupId: groupId, userId: ownerId },
      },
    });
    if (!owner || owner.role !== 'OWNER') {
      throw new BadRequestException(
        'Only workspace owners can promote or demote members.',
      );
    }

    const target = await this.prisma.studyGroupMember.findUnique({
      where: {
        studyGroupId_userId: { studyGroupId: groupId, userId: targetUserId },
      },
    });
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === 'OWNER') {
      throw new BadRequestException("Cannot change the owner's role");
    }

    if (role !== 'ADMIN' && role !== 'MEMBER') {
      throw new BadRequestException('Invalid member role');
    }

    return this.prisma.studyGroupMember.update({
      where: {
        studyGroupId_userId: { studyGroupId: groupId, userId: targetUserId },
      },
      data: { role },
    });
  }

  async transferOwnership(
    ownerId: string,
    groupId: string,
    newOwnerId: string,
  ) {
    const owner = await this.prisma.studyGroupMember.findUnique({
      where: {
        studyGroupId_userId: { studyGroupId: groupId, userId: ownerId },
      },
    });
    if (!owner || owner.role !== 'OWNER') {
      throw new BadRequestException(
        'Only the current workspace owner can transfer ownership.',
      );
    }

    const target = await this.prisma.studyGroupMember.findUnique({
      where: {
        studyGroupId_userId: { studyGroupId: groupId, userId: newOwnerId },
      },
    });
    if (!target)
      throw new NotFoundException(
        'New owner must be a member of the workspace',
      );

    return this.prisma.$transaction(async (tx) => {
      await tx.studyGroup.update({
        where: { id: groupId },
        data: { ownerId: newOwnerId },
      });
      await tx.studyGroupMember.update({
        where: {
          studyGroupId_userId: { studyGroupId: groupId, userId: ownerId },
        },
        data: { role: 'ADMIN' },
      });
      await tx.studyGroupMember.update({
        where: {
          studyGroupId_userId: { studyGroupId: groupId, userId: newOwnerId },
        },
        data: { role: 'OWNER' },
      });
    });
  }

  async listGroupFiles(studyGroupId: string) {
    const resources = await this.prisma.groupResource.findMany({
      where: { studyGroupId },
      orderBy: { createdAt: 'desc' },
      include: {
        sharedBy: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true,
                username: true,
              },
            },
          },
        },
      },
    });

    const resolved = [];
    for (const res of resources) {
      let details: any = null;
      try {
        if (res.resourceType === 'FILE') {
          details = await this.prisma.document.findUnique({
            where: { id: res.resourceId },
          });
        } else if (res.resourceType === 'NOTE') {
          details = await this.prisma.note.findUnique({
            where: { id: res.resourceId },
          });
        } else if (res.resourceType === 'QUIZ') {
          details = await this.prisma.quiz.findUnique({
            where: { id: res.resourceId },
          });
        } else if (res.resourceType === 'FLASHCARD_DECK') {
          details = await this.prisma.flashcardDeck.findUnique({
            where: { id: res.resourceId },
          });
        } else if (res.resourceType === 'NOTEBOOK') {
          details = await this.prisma.notebook.findUnique({
            where: { id: res.resourceId },
          });
        }
      } catch (e) {
        console.error(
          `Failed to resolve resource ${res.resourceType} ${res.resourceId}:`,
          e,
        );
      }

      resolved.push({
        id: res.id,
        resourceType: res.resourceType,
        resourceId: res.resourceId,
        studyGroupId: res.studyGroupId,
        sharedBy: res.sharedBy,
        createdAt: res.createdAt,
        document: res.resourceType === 'FILE' ? details : null,
        metadata: details || null,
      });
    }
    return resolved;
  }

  async attachResourceToGroup(
    userId: string,
    groupId: string,
    resourceType: string,
    resourceId: string,
  ) {
    const member = await this.prisma.studyGroupMember.findUnique({
      where: { studyGroupId_userId: { studyGroupId: groupId, userId } },
    });
    if (!member) {
      throw new BadRequestException('You are not a member of this workspace');
    }

    const existing = await this.prisma.groupResource.findFirst({
      where: { studyGroupId: groupId, resourceType, resourceId },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.groupResource.create({
      data: {
        studyGroupId: groupId,
        resourceType,
        resourceId,
        sharedById: userId,
      },
    });
  }

  async deleteGroupResourceFile(
    userId: string,
    groupId: string,
    resourceId: string,
    storageService: any,
  ) {
    const resource = await this.prisma.groupResource.findFirst({
      where: { id: resourceId, studyGroupId: groupId },
    });
    if (!resource) throw new NotFoundException('Resource not found');

    if (resource.sharedById !== userId) {
      const member = await this.prisma.studyGroupMember.findUnique({
        where: { studyGroupId_userId: { studyGroupId: groupId, userId } },
      });
      if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
        throw new BadRequestException(
          'Only workspace owners, admins, or the uploader can remove this resource.',
        );
      }
    }

    try {
      if (resource.resourceType === 'FILE') {
        await storageService.deleteUserFile(
          resource.sharedById,
          resource.resourceId,
        );
      }
    } catch (err) {
      console.error(
        'Failed to delete physical file from storage service:',
        err,
      );
    }

    await this.prisma.groupResource.delete({
      where: { id: resourceId },
    });

    return { success: true };
  }

  async shareFileInGroup(
    userId: string,
    groupId: string,
    originalName: string,
    buffer: Buffer,
    mimeType: string,
    storageService: any,
  ) {
    const member = await this.prisma.studyGroupMember.findUnique({
      where: { studyGroupId_userId: { studyGroupId: groupId, userId } },
    });
    if (!member) {
      throw new BadRequestException('You are not a member of this workspace');
    }

    const doc = await storageService.uploadUserFile(
      userId,
      originalName,
      buffer,
      mimeType,
    );

    return this.prisma.groupResource.create({
      data: {
        studyGroupId: groupId,
        resourceType: 'FILE',
        resourceId: doc.id,
        sharedById: userId,
      },
    });
  }

  async getWorkspaceActivityFeed(groupId: string) {
    const [members, resources, invites] = await Promise.all([
      this.prisma.studyGroupMember.findMany({
        where: { studyGroupId: groupId },
        include: { user: { include: { profile: true } } },
        orderBy: { joinedAt: 'desc' },
        take: 15,
      }),
      this.prisma.groupResource.findMany({
        where: { studyGroupId: groupId },
        include: { sharedBy: { include: { profile: true } } },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
      this.prisma.groupInvite.findMany({
        where: { studyGroupId: groupId },
        include: {
          invitee: { include: { profile: true } },
          inviter: { include: { profile: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
    ]);

    const feed: any[] = [];

    for (const m of members) {
      const name = m.user.profile
        ? `${m.user.profile.firstName} ${m.user.profile.lastName}`
        : m.user.email.split('@')[0];
      feed.push({
        id: `member-${m.userId}-${m.joinedAt.getTime()}`,
        type: 'MEMBER_JOINED',
        userId: m.userId,
        userName: name,
        userAvatarUrl: m.user.profile?.avatarUrl || null,
        timestamp: m.joinedAt,
        details: { role: m.role },
      });
    }

    for (const r of resources) {
      const name = r.sharedBy.profile
        ? `${r.sharedBy.profile.firstName} ${r.sharedBy.profile.lastName}`
        : r.sharedBy.email.split('@')[0];
      feed.push({
        id: `resource-${r.id}`,
        type: 'RESOURCE_ADDED',
        userId: r.sharedById,
        userName: name,
        userAvatarUrl: r.sharedBy.profile?.avatarUrl || null,
        timestamp: r.createdAt,
        details: { resourceType: r.resourceType, resourceId: r.resourceId },
      });
    }

    for (const i of invites) {
      const inviterName = i.inviter.profile
        ? `${i.inviter.profile.firstName} ${i.inviter.profile.lastName}`
        : i.inviter.email.split('@')[0];
      const inviteeName = i.invitee.profile
        ? `${i.invitee.profile.firstName} ${i.invitee.profile.lastName}`
        : i.invitee.email.split('@')[0];

      feed.push({
        id: `invite-${i.id}`,
        type: i.status === 'ACCEPTED' ? 'INVITE_ACCEPTED' : 'INVITE_SENT',
        userId: i.inviterId,
        userName: inviterName,
        userAvatarUrl: i.inviter.profile?.avatarUrl || null,
        timestamp: i.createdAt,
        details: { inviteeName, status: i.status },
      });
    }

    return feed
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 30);
  }
}
