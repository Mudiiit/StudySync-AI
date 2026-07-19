import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { CollabRole } from '@prisma/client';

@Injectable()
export class NotesCollaborationService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  // ==========================================
  // PERMISSIONS AND ROLES
  // ==========================================

  async getNoteUserRole(
    userId: string,
    noteId: string,
  ): Promise<'OWNER' | 'EDITOR' | 'COMMENTER' | 'VIEWER' | null> {
    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
      include: {
        collaborators: {
          where: { userId },
        },
      },
    });

    if (!note) return null;
    if (note.userId === userId) return 'OWNER';

    const collaborator = note.collaborators[0];
    if (collaborator) {
      if (collaborator.role === CollabRole.OWNER) return 'OWNER';
      if (
        collaborator.role === CollabRole.EDITOR ||
        collaborator.role === CollabRole.WRITE
      )
        return 'EDITOR';
      if (collaborator.role === CollabRole.COMMENTER) return 'COMMENTER';
      return 'VIEWER';
    }

    if (note.isShared) {
      return 'VIEWER';
    }

    return null;
  }

  async checkPermission(
    userId: string,
    noteId: string,
    required: ('OWNER' | 'EDITOR' | 'COMMENTER' | 'VIEWER')[],
  ): Promise<any> {
    const role = await this.getNoteUserRole(userId, noteId);
    if (!role || !required.includes(role)) {
      throw new ForbiddenException(
        'You lack the necessary permissions to access this resource',
      );
    }
    return role;
  }

  // ==========================================
  // SHARING & COLLABORATORS
  // ==========================================

  async shareNote(
    userId: string,
    noteId: string,
    targetEmail: string,
    role: 'VIEWER' | 'COMMENTER' | 'EDITOR',
  ) {
    // Check permission - Owner or Editor can share
    const userRole = await this.checkPermission(userId, noteId, [
      'OWNER',
      'EDITOR',
    ]);

    // Find target user by email
    const targetUser = await this.prisma.user.findUnique({
      where: { email: targetEmail },
      include: { profile: true },
    });
    if (!targetUser) {
      throw new NotFoundException(`User with email ${targetEmail} not found`);
    }

    if (targetUser.id === userId) {
      throw new BadRequestException('You cannot share a note with yourself');
    }

    // Map internal CollabRole
    let dbRole: CollabRole = CollabRole.VIEWER;
    if (role === 'EDITOR') dbRole = CollabRole.EDITOR;
    if (role === 'COMMENTER') dbRole = CollabRole.COMMENTER;

    // Upsert collaborator link
    const collab = await this.prisma.noteCollaborator.upsert({
      where: {
        noteId_userId: {
          noteId,
          userId: targetUser.id,
        },
      },
      update: { role: dbRole },
      create: {
        noteId,
        userId: targetUser.id,
        role: dbRole,
      },
      include: {
        user: {
          select: {
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

    // Mark note as shared
    await this.prisma.note.update({
      where: { id: noteId },
      data: { isShared: true },
    });

    // Send system and real-time notification
    const note = await this.prisma.note.findUnique({ where: { id: noteId } });
    const sharer = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    const sharerName = sharer?.profile
      ? `${sharer.profile.firstName} ${sharer.profile.lastName}`
      : 'Someone';

    await this.notificationsService.sendNotification(
      targetUser.id,
      'New Shared Note',
      `${sharerName} shared the note "${note?.title}" with you as an ${role}.`,
      'collab',
    );

    // Log action to timeline audit
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'SHARE_NOTE',
        entityName: 'Note',
        entityId: noteId,
        metadata: { targetEmail, role },
      },
    });

    return collab;
  }

  async removeCollaborator(
    userId: string,
    noteId: string,
    targetUserId: string,
  ) {
    // Only owner can remove collaborators
    await this.checkPermission(userId, noteId, ['OWNER']);

    await this.prisma.noteCollaborator.delete({
      where: {
        noteId_userId: {
          noteId,
          userId: targetUserId,
        },
      },
    });

    // Log action
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'REMOVE_COLLABORATOR',
        entityName: 'Note',
        entityId: noteId,
        metadata: { targetUserId },
      },
    });

    // Check if any collaborators remain, if not disable isShared
    const count = await this.prisma.noteCollaborator.count({
      where: { noteId },
    });
    if (count === 0) {
      await this.prisma.note.update({
        where: { id: noteId },
        data: { isShared: false },
      });
    }

    return { success: true };
  }

  async getCollaborators(userId: string, noteId: string) {
    await this.checkPermission(userId, noteId, [
      'OWNER',
      'EDITOR',
      'COMMENTER',
      'VIEWER',
    ]);

    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
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
        collaborators: {
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
        },
      },
    });

    if (!note) throw new NotFoundException('Note not found');

    const result = [
      {
        id: note.user.id,
        email: note.user.email,
        name: note.user.profile
          ? `${note.user.profile.firstName} ${note.user.profile.lastName}`
          : 'Owner',
        avatarUrl: note.user.profile?.avatarUrl || null,
        role: 'OWNER',
        isOwner: true,
      },
      ...note.collaborators.map((c) => ({
        id: c.user.id,
        email: c.user.email,
        name: c.user.profile
          ? `${c.user.profile.firstName} ${c.user.profile.lastName}`
          : 'Collaborator',
        avatarUrl: c.user.profile?.avatarUrl || null,
        role:
          c.role === CollabRole.EDITOR || c.role === CollabRole.WRITE
            ? 'EDITOR'
            : c.role,
        isOwner: false,
      })),
    ];

    return result;
  }

  // ==========================================
  // COMMENTS ENGINE
  // ==========================================

  async getNoteComments(userId: string, noteId: string) {
    await this.checkPermission(userId, noteId, [
      'OWNER',
      'EDITOR',
      'COMMENTER',
      'VIEWER',
    ]);

    // Return root comments and include their threaded replies
    return this.prisma.noteComment.findMany({
      where: { noteId, parentId: null },
      orderBy: { createdAt: 'asc' },
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
        replies: {
          orderBy: { createdAt: 'asc' },
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
        },
      },
    });
  }

  async createComment(
    userId: string,
    noteId: string,
    dto: {
      content: string;
      parentId?: string;
      highlightStart?: number;
      highlightEnd?: number;
      highlightText?: string;
    },
  ) {
    // Owner, Editor, or Commenter can comment
    await this.checkPermission(userId, noteId, [
      'OWNER',
      'EDITOR',
      'COMMENTER',
    ]);

    const comment = await this.prisma.noteComment.create({
      data: {
        noteId,
        userId,
        content: dto.content,
        parentId: dto.parentId || null,
        highlightStart: dto.highlightStart || null,
        highlightEnd: dto.highlightEnd || null,
        highlightText: dto.highlightText || null,
      },
      include: {
        user: {
          select: {
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    const note = await this.prisma.note.findUnique({ where: { id: noteId } });
    const authorName = comment.user.profile
      ? `${comment.user.profile.firstName} ${comment.user.profile.lastName}`
      : 'Someone';

    // Notify note owner if comment is not by owner
    if (note && note.userId !== userId && !dto.parentId) {
      await this.notificationsService.sendNotification(
        note.userId,
        'Comment Added',
        `${authorName} commented on your note "${note.title}": "${dto.content.substring(0, 30)}..."`,
        'comment',
      );
    }

    // Notify parent comment author if reply
    if (dto.parentId) {
      const parentComment = await this.prisma.noteComment.findUnique({
        where: { id: dto.parentId },
      });
      if (parentComment && parentComment.userId !== userId) {
        await this.notificationsService.sendNotification(
          parentComment.userId,
          'Reply Received',
          `${authorName} replied to your comment on "${note?.title}": "${dto.content.substring(0, 30)}..."`,
          'reply',
        );
      }
    }

    // Process mentions (@username or @email)
    const mentionRegex = /@(\S+)/g;
    let match;
    while ((match = mentionRegex.exec(dto.content)) !== null) {
      const parsedMention = match[1].replace(/[^a-zA-Z0-9_\-+@.]/g, '');
      // Try to find user by email or name match
      const mentionedUser = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email: { contains: parsedMention, mode: 'insensitive' } },
            {
              profile: {
                OR: [
                  {
                    firstName: { contains: parsedMention, mode: 'insensitive' },
                  },
                  {
                    lastName: { contains: parsedMention, mode: 'insensitive' },
                  },
                ],
              },
            },
          ],
        },
      });

      if (mentionedUser && mentionedUser.id !== userId) {
        await this.notificationsService.sendNotification(
          mentionedUser.id,
          'Mentioned in Comment',
          `${authorName} mentioned you in a comment inside "${note?.title}": "${dto.content.substring(0, 30)}..."`,
          'mention',
        );
      }
    }

    // Log timeline
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: dto.parentId ? 'REPLY_ADDED' : 'COMMENT_ADDED',
        entityName: 'Note',
        entityId: noteId,
        metadata: { commentId: comment.id },
      },
    });

    return comment;
  }

  async updateComment(userId: string, commentId: string, content: string) {
    const comment = await this.prisma.noteComment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    return this.prisma.noteComment.update({
      where: { id: commentId },
      data: { content },
    });
  }

  async resolveComment(userId: string, commentId: string, resolved: boolean) {
    const comment = await this.prisma.noteComment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    // Check permission: Owner, Editor, or Commenter
    await this.checkPermission(userId, comment.noteId, [
      'OWNER',
      'EDITOR',
      'COMMENTER',
    ]);

    const updated = await this.prisma.noteComment.update({
      where: { id: commentId },
      data: {
        resolved,
        resolvedByUserId: resolved ? userId : null,
      },
    });

    // Log timeline
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: resolved ? 'COMMENT_RESOLVED' : 'COMMENT_UNRESOLVED',
        entityName: 'Note',
        entityId: comment.noteId,
        metadata: { commentId },
      },
    });

    return updated;
  }

  async deleteComment(userId: string, commentId: string) {
    const comment = await this.prisma.noteComment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    const role = await this.getNoteUserRole(userId, comment.noteId);

    // User can delete if they are the comment author OR note owner / editor
    const isAuthor = comment.userId === userId;
    const isModerator = role === 'OWNER' || role === 'EDITOR';

    if (!isAuthor && !isModerator) {
      throw new ForbiddenException(
        'You lack permission to delete this comment',
      );
    }

    await this.prisma.noteComment.delete({
      where: { id: commentId },
    });

    return { success: true };
  }

  // ==========================================
  // TIMELINE ACTIVITY LOG
  // ==========================================

  async getNoteTimeline(userId: string, noteId: string) {
    await this.checkPermission(userId, noteId, [
      'OWNER',
      'EDITOR',
      'COMMENTER',
      'VIEWER',
    ]);

    return this.prisma.auditLog.findMany({
      where: {
        entityName: 'Note',
        entityId: noteId,
      },
      include: {
        user: {
          select: {
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
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit timeline events
    });
  }
}
