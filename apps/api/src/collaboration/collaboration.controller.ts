import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { FileInterceptor } from '@nestjs/platform-express';
import { WorkspaceService } from './services/workspace.service';
import { GroupChatService } from './services/group-chat.service';
import { PresenceService } from './services/presence.service';
import { NotesCollaborationService } from './services/notes-collaboration.service';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { CollaborationGateway } from './collaboration.gateway';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('collaboration')
@UseGuards(JwtAuthGuard)
export class CollaborationController {
  constructor(
    private workspaceService: WorkspaceService,
    private groupChatService: GroupChatService,
    private presenceService: PresenceService,
    private notesCollabService: NotesCollaborationService,
    private storageService: StorageService,
    private prisma: PrismaService,
    private gateway: CollaborationGateway,
  ) {}

  // ==========================================
  // STUDY GROUPS & MEMBERS
  // ==========================================

  @Post('groups')
  async createGroup(
    @CurrentUser() user: any,
    @Body('name') name: string,
    @Body('description') description?: string,
  ) {
    if (!name) throw new BadRequestException('Workspace name is required');
    return this.workspaceService.createGroup(user.id, name, description);
  }

  @Get('groups')
  async listGroups(@CurrentUser() user: any) {
    return this.workspaceService.listUserGroups(user.id);
  }

  @Get('groups/:id/members')
  async listMembers(@Param('id') groupId: string) {
    return this.workspaceService.listGroupMembers(groupId);
  }

  // ==========================================
  // INVITATIONS
  // ==========================================

  @Post('groups/:id/invite')
  async inviteMember(
    @CurrentUser() user: any,
    @Param('id') groupId: string,
    @Body('email') email: string,
  ) {
    if (!email) throw new BadRequestException('Target email is required');
    return this.workspaceService.inviteMember(user.id, groupId, email);
  }

  @Post('invite/accept')
  async acceptInvite(@CurrentUser() user: any, @Body('token') token: string) {
    if (!token) throw new BadRequestException('Token code is required');
    return this.workspaceService.acceptInvitation(user.id, token);
  }

  // ==========================================
  // MESSAGES CHAT LOGS
  // ==========================================

  @Get('groups/:id/messages')
  async getMessages(
    @Param('id') groupId: string,
    @Query('limit') limit?: string,
  ) {
    const lim = limit ? parseInt(limit, 10) : 50;
    return this.groupChatService.getMessages(groupId, lim);
  }

  @Post('groups/:id/messages')
  async sendMessage(
    @CurrentUser() user: any,
    @Param('id') groupId: string,
    @Body('content') content: string,
  ) {
    if (!content) throw new BadRequestException('Message content is required');
    const msg = await this.groupChatService.sendMessage(
      user.id,
      groupId,
      content,
    );

    this.gateway.emitToRoom(`group:${groupId}`, 'group:message', msg);

    try {
      let text = '';
      try {
        const obj = JSON.parse(content);
        text = obj.text || '';
      } catch (e) {
        text = content;
      }

      const mentions = text.match(/@(\w+)/g);
      if (mentions) {
        const group = await this.prisma.studyGroup.findUnique({
          where: { id: groupId },
          include: {
            members: { include: { user: { include: { profile: true } } } },
          },
        });
        if (!group) return;

        const senderName = user.profile?.username || user.email.split('@')[0];

        for (const mention of mentions) {
          const username = mention.substring(1);
          let targetUsers = [];

          if (username === 'everyone') {
            targetUsers = group.members
              .map((m) => m.user)
              .filter((u) => u.id !== user.id);
          } else if (username === 'owner') {
            const owner = group.members.find(
              (m) => m.userId === group.ownerId,
            )?.user;
            if (owner && owner.id !== user.id) targetUsers.push(owner);
          } else {
            const matchedMember = group.members.find(
              (m) =>
                m.user.profile?.username?.toLowerCase() ===
                username.toLowerCase(),
            );
            if (matchedMember && matchedMember.userId !== user.id) {
              targetUsers.push(matchedMember.user);
            }
          }

          for (const target of targetUsers) {
            const notif = await this.prisma.notification.create({
              data: {
                userId: target.id,
                title: 'New Mention',
                message: `${senderName} mentioned you in "${group.name}".`,
                type: 'MENTION',
                isRead: false,
              },
            });
            this.gateway.emitToRoom(
              `user:${target.id}`,
              'notification:received',
              notif,
            );
          }
        }
      }
    } catch (err) {
      console.error('Mention processing failed:', err);
    }

    return msg;
  }

  // ==========================================
  // COLLABORATION PRESENCE LOGS
  // ==========================================

  @Get('presence')
  async getActivePresence() {
    return this.presenceService.getActiveUsers();
  }

  // ==========================================
  // NOTE COLLABORATION & SHARING
  // ==========================================

  @Post('notes/:id/share')
  async shareNote(
    @CurrentUser() user: any,
    @Param('id') noteId: string,
    @Body('email') email: string,
    @Body('role') role: 'VIEWER' | 'COMMENTER' | 'EDITOR',
  ) {
    if (!email) throw new BadRequestException('Target email is required');
    if (!role) throw new BadRequestException('Permission role is required');
    return this.notesCollabService.shareNote(user.id, noteId, email, role);
  }

  @Get('notes/:id/collaborators')
  async getCollaborators(
    @CurrentUser() user: any,
    @Param('id') noteId: string,
  ) {
    return this.notesCollabService.getCollaborators(user.id, noteId);
  }

  @Delete('notes/:id/collaborators/:userId')
  async removeCollaborator(
    @CurrentUser() user: any,
    @Param('id') noteId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.notesCollabService.removeCollaborator(
      user.id,
      noteId,
      targetUserId,
    );
  }

  // ==========================================
  // NOTE COMMENTS
  // ==========================================

  @Get('notes/:id/comments')
  async getComments(@CurrentUser() user: any, @Param('id') noteId: string) {
    return this.notesCollabService.getNoteComments(user.id, noteId);
  }

  @Post('notes/:id/comments')
  async addComment(
    @CurrentUser() user: any,
    @Param('id') noteId: string,
    @Body()
    dto: {
      content: string;
      parentId?: string;
      highlightStart?: number;
      highlightEnd?: number;
      highlightText?: string;
    },
  ) {
    if (!dto.content)
      throw new BadRequestException('Comment content is required');
    return this.notesCollabService.createComment(user.id, noteId, dto);
  }

  @Patch('notes/:id/comments/:commentId')
  async updateComment(
    @CurrentUser() user: any,
    @Param('commentId') commentId: string,
    @Body('content') content?: string,
    @Body('resolved') resolved?: boolean,
  ) {
    if (content !== undefined) {
      return this.notesCollabService.updateComment(user.id, commentId, content);
    }
    if (resolved !== undefined) {
      return this.notesCollabService.resolveComment(
        user.id,
        commentId,
        resolved,
      );
    }
    throw new BadRequestException('No valid update fields provided');
  }

  @Delete('notes/:id/comments/:commentId')
  async deleteComment(
    @CurrentUser() user: any,
    @Param('commentId') commentId: string,
  ) {
    return this.notesCollabService.deleteComment(user.id, commentId);
  }

  // ==========================================
  // NOTE TIMELINE ACTIVITY
  // ==========================================

  @Get('notes/:id/activity')
  async getNoteActivity(@CurrentUser() user: any, @Param('id') noteId: string) {
    return this.notesCollabService.getNoteTimeline(user.id, noteId);
  }

  // ==========================================
  // WORKSPACE CONTROLS
  // ==========================================

  @Patch('groups/:id')
  async renameGroup(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('name') name: string,
    @Body('description') description?: string,
  ) {
    if (!name) throw new BadRequestException('Workspace name is required');
    const updated = await this.workspaceService.renameGroup(
      user.id,
      id,
      name,
      description,
    );
    const members = await this.prisma.studyGroupMember.findMany({
      where: { studyGroupId: id },
      select: { userId: true },
    });
    const userIds = members.map((m) => m.userId);
    this.gateway.emitToUsers(userIds, 'group:updated', updated);
    return updated;
  }

  @Delete('groups/:id')
  async deleteGroup(@CurrentUser() user: any, @Param('id') id: string) {
    const members = await this.prisma.studyGroupMember.findMany({
      where: { studyGroupId: id },
      select: { userId: true },
    });
    const userIds = members.map((m) => m.userId);

    const res = await this.workspaceService.deleteGroup(user.id, id);
    this.gateway.emitToUsers(userIds, 'group:deleted', {
      groupId: id,
      deletedBy: user.id,
    });
    return res;
  }

  @Post('groups/:id/leave')
  async leaveGroup(@CurrentUser() user: any, @Param('id') id: string) {
    const res = await this.workspaceService.leaveGroup(user.id, id);
    this.gateway.emitToRoom(`group:${id}`, 'group:member:left', {
      groupId: id,
      userId: user.id,
    });
    return res;
  }

  // ==========================================
  // RICH MESSAGES EDIT / DELETE / REACTIONS
  // ==========================================

  @Patch('messages/:id')
  async editMessage(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('content') content: string,
  ) {
    if (!content) throw new BadRequestException('Message content is required');
    const updated = await this.groupChatService.editMessage(
      user.id,
      id,
      content,
    );
    this.gateway.emitToRoom(
      `group:${updated.studyGroupId}`,
      'group:message:edit',
      updated,
    );
    return updated;
  }

  @Delete('messages/:id')
  async deleteMessage(@CurrentUser() user: any, @Param('id') id: string) {
    const msg = await this.prisma.studyGroupMessage.findUnique({
      where: { id },
    });
    const res = await this.groupChatService.deleteMessage(user.id, id);
    if (msg) {
      this.gateway.emitToRoom(
        `group:${msg.studyGroupId}`,
        'group:message:delete',
        id,
      );
    }
    return res;
  }

  @Patch('messages/:id/react')
  async toggleReaction(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('emoji') emoji: string,
  ) {
    if (!emoji) throw new BadRequestException('Emoji is required');
    const updated = await this.groupChatService.toggleReaction(
      user.id,
      id,
      emoji,
    );
    this.gateway.emitToRoom(
      `group:${updated.studyGroupId}`,
      'group:message:edit',
      updated,
    );
    return updated;
  }

  // ==========================================
  // MODERN INVITATIONS (PENDING/RECEIVED)
  // ==========================================

  @Get('invites')
  async getReceivedInvitations(@CurrentUser() user: any) {
    return this.workspaceService.getUserInvitations(user.id);
  }

  @Get('groups/:id/invites')
  async getGroupInvitations(@Param('id') id: string) {
    return this.workspaceService.getGroupInvitations(id);
  }

  @Get('groups/:id/activity')
  async getGroupActivityFeed(@Param('id') id: string) {
    return this.workspaceService.getWorkspaceActivityFeed(id);
  }

  @Post('groups/:id/invite-user')
  async inviteUser(
    @CurrentUser() user: any,
    @Param('id') groupId: string,
    @Body('inviteeId') inviteeId?: string,
    @Body('email') email?: string,
    @Body('username') username?: string,
  ) {
    if (!inviteeId && !email && !username) {
      throw new BadRequestException(
        'Please specify a username, email, or user ID to invite',
      );
    }
    const invite = await this.workspaceService.createGroupInvite(
      user.id,
      groupId,
      {
        inviteeId,
        email,
        username,
      },
    );

    const fullInvite = await this.prisma.groupInvite.findUnique({
      where: { id: invite.id },
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

    this.gateway.emitToRoom(
      `user:${invite.inviteeId}`,
      'group:invite:received',
      fullInvite,
    );
    this.gateway.emitToRoom(
      `group:${groupId}`,
      'group:invite:sent',
      fullInvite,
    );
    return invite;
  }

  @Post('invites/:id/respond')
  async respondToInvite(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('accept') accept: boolean,
  ) {
    const invite = await this.prisma.groupInvite.findUnique({
      where: { id },
      include: { group: true },
    });
    const res = await this.workspaceService.respondToGroupInvite(
      user.id,
      id,
      accept,
    );
    if (invite) {
      if (accept) {
        this.gateway.emitToRoom(
          `group:${invite.studyGroupId}`,
          'group:invite:accepted',
          { inviteeId: user.id },
        );
        this.gateway.emitToRoom(
          `user:${user.id}`,
          'group:joined',
          invite.group,
        );
      } else {
        this.gateway.emitToRoom(
          `group:${invite.studyGroupId}`,
          'group:invite:declined',
          { inviteeId: user.id },
        );
      }
    }
    return res;
  }

  // ==========================================
  // SHARED FILES
  // ==========================================

  @Post('groups/:id/resources/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadWorkspaceFile(
    @CurrentUser() user: any,
    @Param('id') groupId: string,
    @UploadedFile() file: any,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const resource = await this.workspaceService.shareFileInGroup(
      user.id,
      groupId,
      file.originalname,
      file.buffer,
      file.mimetype,
      this.storageService,
    );

    const fullFiles = await this.workspaceService.listGroupFiles(groupId);
    const uploadedResource = fullFiles.find(
      (f: any) => f.resourceId === resource.resourceId,
    );

    this.gateway.emitToRoom(
      `group:${groupId}`,
      'group:file:uploaded',
      uploadedResource || resource,
    );
    return resource;
  }

  @Get('groups/:id/resources/files')
  async listGroupFiles(@Param('id') id: string) {
    return this.workspaceService.listGroupFiles(id);
  }

  @Delete('groups/:id/resources/:resourceId')
  async deleteGroupFile(
    @CurrentUser() user: any,
    @Param('id') groupId: string,
    @Param('resourceId') resourceId: string,
  ) {
    const res = await this.workspaceService.deleteGroupResourceFile(
      user.id,
      groupId,
      resourceId,
      this.storageService,
    );
    this.gateway.emitToRoom(`group:${groupId}`, 'group:file:deleted', {
      resourceId,
    });
    return res;
  }

  // ==========================================
  // MEMBER MANAGEMENT
  // ==========================================

  @Delete('groups/:id/members/:userId')
  async removeMember(
    @CurrentUser() user: any,
    @Param('id') groupId: string,
    @Param('userId') targetUserId: string,
  ) {
    const res = await this.workspaceService.removeMember(
      user.id,
      groupId,
      targetUserId,
    );
    this.gateway.emitToRoom(`group:${groupId}`, 'group:member:left', {
      groupId,
      userId: targetUserId,
    });
    this.gateway.emitToRoom(`user:${targetUserId}`, 'group:removed', {
      groupId,
    });
    return res;
  }

  @Patch('groups/:id/members/:userId/role')
  async updateMemberRole(
    @CurrentUser() user: any,
    @Param('id') groupId: string,
    @Param('userId') targetUserId: string,
    @Body('role') role: string,
  ) {
    const updated = await this.workspaceService.updateMemberRole(
      user.id,
      groupId,
      targetUserId,
      role,
    );
    this.gateway.emitToRoom(
      `group:${groupId}`,
      'group:member:updated',
      updated,
    );
    return updated;
  }

  @Post('groups/:id/transfer-ownership')
  async transferOwnership(
    @CurrentUser() user: any,
    @Param('id') groupId: string,
    @Body('newOwnerId') newOwnerId: string,
  ) {
    if (!newOwnerId) throw new BadRequestException('New owner ID is required');
    const res = await this.workspaceService.transferOwnership(
      user.id,
      groupId,
      newOwnerId,
    );
    this.gateway.emitToRoom(`group:${groupId}`, 'group:ownership:transferred', {
      ownerId: newOwnerId,
    });
    return res;
  }

  @Post('groups/:id/resources')
  async attachResource(
    @CurrentUser() user: any,
    @Param('id') groupId: string,
    @Body('resourceType') resourceType: string,
    @Body('resourceId') resourceId: string,
  ) {
    if (!resourceType || !resourceId) {
      throw new BadRequestException('Resource type and ID are required');
    }
    const resource = await this.workspaceService.attachResourceToGroup(
      user.id,
      groupId,
      resourceType,
      resourceId,
    );

    const fullFiles = await this.workspaceService.listGroupFiles(groupId);
    const uploadedResource = fullFiles.find((f: any) => f.id === resource.id);

    this.gateway.emitToRoom(
      `group:${groupId}`,
      'group:file:uploaded',
      uploadedResource || resource,
    );
    return resource;
  }

  @Get('groups/:id/whiteboard')
  async getWhiteboard(@Param('id') groupId: string) {
    const dir = path.join(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      'storage',
      'whiteboards',
    );
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    const filePath = path.join(dir, `${groupId}.json`);
    if (!fs.existsSync(filePath)) {
      return {
        mode: 'editing',
        pages: [
          {
            id: 'default',
            name: 'Physics Notes',
            canvasData: '',
            zoom: 1,
            pan: { x: -1600, y: -1750 },
          },
        ],
      };
    }
    try {
      const data = await fs.promises.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      return {
        mode: 'editing',
        pages: [
          {
            id: 'default',
            name: 'Physics Notes',
            canvasData: '',
            zoom: 1,
            pan: { x: -1600, y: -1750 },
          },
        ],
      };
    }
  }

  @Post('groups/:id/whiteboard')
  async saveWhiteboard(
    @Param('id') groupId: string,
    @Body() body: { mode: string; pages: any[] },
  ) {
    const dir = path.join(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      'storage',
      'whiteboards',
    );
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    const filePath = path.join(dir, `${groupId}.json`);
    await fs.promises.writeFile(filePath, JSON.stringify(body), 'utf8');
    return { success: true };
  }
}
