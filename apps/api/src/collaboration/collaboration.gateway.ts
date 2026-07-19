import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PresenceService } from './services/presence.service';
import { NotesCollaborationService } from './services/notes-collaboration.service';
import { PrismaService } from '../prisma/prisma.service';
import { Logger } from '@nestjs/common';
import { AiEngine } from '../ai/ai.engine';

@WebSocketGateway({ cors: { origin: '*' } })
export class CollaborationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(CollaborationGateway.name);

  constructor(
    private jwtService: JwtService,
    private presenceService: PresenceService,
    private notesCollabService: NotesCollaborationService,
    private prisma: PrismaService,
    private aiEngine: AiEngine,
  ) {}

  emitToRoom(room: string, event: string, payload: any) {
    this.server?.to(room).emit(event, payload);
  }

  emitToUsers(userIds: string[], event: string, payload: any) {
    userIds.forEach((userId) => {
      this.server?.to(`user:${userId}`).emit(event, payload);
    });
  }

  async handleConnection(client: Socket) {
    const authHeader =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization ||
      client.handshake.query?.token;
    let token: string | null = null;

    if (authHeader) {
      token = authHeader.startsWith('Bearer ')
        ? authHeader.substring(7)
        : authHeader;
    }

    if (!token) {
      this.logger.warn(
        `Missing Authorization header - disconnecting socket client: ${client.id}`,
      );
      client.emit('auth_error', { message: 'Missing Authorization header' });
      client.disconnect();
      return;
    }

    try {
      const decoded = this.jwtService.verify(token);
      client.data.userId = decoded.sub;
      client.data.email = decoded.email || 'student@studysync.ai';
      client.join(`user:${decoded.sub}`);

      // Fetch user profile info to attach to client metadata
      try {
        const u = await this.prisma.user.findUnique({
          where: { id: decoded.sub },
          include: { profile: true },
        });
        if (u) {
          client.data.name = u.profile
            ? `${u.profile.firstName} ${u.profile.lastName}`
            : 'Collaborator';
          client.data.avatarUrl = u.profile?.avatarUrl || null;
          // Select random cursor color
          const colors = [
            '#8B5CF6',
            '#EC4899',
            '#3B82F6',
            '#10B981',
            '#F59E0B',
            '#EF4444',
          ];
          client.data.cursorColor =
            colors[Math.floor(Math.random() * colors.length)];
        }
      } catch (err) {
        this.logger.error('Failed to load profile for presence', err);
      }

      this.presenceService.setOnline(decoded.sub, 'dashboard');
      this.logger.log(
        `User connected to Collaboration Gateway: ${decoded.sub}`,
      );
    } catch (e: any) {
      let diagMessage = 'Token verification failed';
      if (e.name === 'TokenExpiredError') {
        diagMessage = 'Expired access token';
      } else if (e.message === 'jwt malformed') {
        diagMessage = 'Malformed JWT';
      } else if (e.message === 'invalid signature') {
        diagMessage = 'Invalid signature';
      } else {
        diagMessage = `Token verification failed: ${e.message}`;
      }

      this.logger.warn(
        `${diagMessage} - disconnecting socket client: ${client.id}`,
      );
      client.emit('auth_error', { message: diagMessage });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket, reason?: string) {
    if (client.data.userId) {
      this.presenceService.setOffline(client.data.userId);
      this.presenceService.setNoteInactive(client.id);
      this.presenceService.setGroupInactive(client.id);

      if (client.data.activeNoteId) {
        const noteId = client.data.activeNoteId;
        this.server.to(`note:${noteId}`).emit('presence:update', {
          noteId,
          users: this.presenceService.getNoteActiveUsers(noteId),
        });
      }

      if (client.data.activeGroupId) {
        const groupId = client.data.activeGroupId;
        this.server.to(`group:${groupId}`).emit('group:presence:update', {
          groupId,
          users: this.presenceService.getGroupActiveUsers(groupId),
        });
      }

      this.logger.log(
        `User disconnected from Collaboration Gateway: ${client.data.userId}. Reason: ${reason || 'unknown'}`,
      );
    }
  }

  @SubscribeMessage('room:join')
  async joinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody('room') room: string,
  ) {
    if (room.startsWith('note:')) {
      const noteId = room.split(':')[1];
      const userId = client.data.userId;
      if (!userId) return;

      try {
        const role = await this.notesCollabService.getNoteUserRole(
          userId,
          noteId,
        );
        if (!role) {
          client.emit('error', 'You lack permission to access this note');
          return;
        }

        client.join(room);
        client.data.activeNoteId = noteId;

        this.presenceService.setNoteActive(client.id, noteId, userId, {
          name: client.data.name || 'Collaborator',
          email: client.data.email,
          avatarUrl: client.data.avatarUrl,
          cursorColor: client.data.cursorColor || '#8B5CF6',
        });

        const activeUsers = this.presenceService.getNoteActiveUsers(noteId);
        this.server
          .to(room)
          .emit('presence:update', { noteId, users: activeUsers });

        await this.prisma.auditLog.create({
          data: {
            userId,
            action: 'JOINED_NOTE',
            entityName: 'Note',
            entityId: noteId,
          },
        });

        this.logger.log(`User ${userId} joined note room: ${noteId}`);
      } catch (err) {
        client.emit('error', 'Failed to join note room');
      }
    } else if (room.startsWith('group:')) {
      const groupId = room.split(':')[1];
      const userId = client.data.userId;
      if (!userId) return;

      client.join(room);
      client.data.activeGroupId = groupId;

      this.presenceService.setGroupActive(client.id, groupId, userId, {
        name: client.data.name || 'Collaborator',
        email: client.data.email,
        avatarUrl: client.data.avatarUrl,
      });

      const activeUsers = this.presenceService.getGroupActiveUsers(groupId);
      this.server
        .to(room)
        .emit('group:presence:update', { groupId, users: activeUsers });

      this.logger.log(`User ${userId} joined group room: ${groupId}`);
    } else {
      client.join(room);
    }
  }

  @SubscribeMessage('room:leave')
  async leaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody('room') room: string,
  ) {
    client.leave(room);
    if (room.startsWith('note:')) {
      const noteId = room.split(':')[1];
      this.presenceService.setNoteInactive(client.id);
      client.data.activeNoteId = null;

      const activeUsers = this.presenceService.getNoteActiveUsers(noteId);
      this.server
        .to(room)
        .emit('presence:update', { noteId, users: activeUsers });

      const userId = client.data.userId;
      if (userId) {
        await this.prisma.auditLog.create({
          data: {
            userId,
            action: 'LEFT_NOTE',
            entityName: 'Note',
            entityId: noteId,
          },
        });
      }
    } else if (room.startsWith('group:')) {
      const groupId = room.split(':')[1];
      this.presenceService.setGroupInactive(client.id);
      client.data.activeGroupId = null;

      const activeUsers = this.presenceService.getGroupActiveUsers(groupId);
      this.server
        .to(room)
        .emit('group:presence:update', { groupId, users: activeUsers });
    }
    this.logger.log(`User ${client.data.userId} left room: ${room}`);
  }

  @SubscribeMessage('group:message:send')
  handleGroupMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string; message: any },
  ) {
    client.to(data.room).emit('group:message', data.message);
  }

  @SubscribeMessage('group:typing')
  handleGroupTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string; isTyping: boolean },
  ) {
    client.to(`group:${data.groupId}`).emit('group:typing:update', {
      userId: client.data.userId,
      name: client.data.name || 'Collaborator',
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('group:message:read')
  handleMessageRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string; messageId: string },
  ) {
    const userId = client.data.userId;
    const name = client.data.name || 'Collaborator';
    if (!userId) return;
    client.to(`group:${data.groupId}`).emit('group:message:read:update', {
      messageId: data.messageId,
      userId,
      name,
    });
  }

  @SubscribeMessage('group:presence:change')
  handlePresenceChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { status: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !client.data.activeGroupId) return;

    this.presenceService.setGroupActive(
      client.id,
      client.data.activeGroupId,
      userId,
      {
        name: client.data.name || 'Collaborator',
        email: client.data.email,
        avatarUrl: client.data.avatarUrl,
        status: data.status,
      },
    );

    this.server
      .to(`group:${client.data.activeGroupId}`)
      .emit('group:presence:update', {
        groupId: client.data.activeGroupId,
        users: this.presenceService.getGroupActiveUsers(
          client.data.activeGroupId,
        ),
      });
  }

  @SubscribeMessage('session:start')
  handleSessionStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;
    const session = this.presenceService.startStudySession(
      data.groupId,
      userId,
    );
    this.server.to(`group:${data.groupId}`).emit('session:started', session);
  }

  @SubscribeMessage('session:end')
  handleSessionEnd(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string },
  ) {
    const session = this.presenceService.endStudySession(data.groupId);
    if (session) {
      this.server.to(`group:${data.groupId}`).emit('session:ended', session);
    }
  }

  @SubscribeMessage('session:get')
  handleSessionGet(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string },
  ) {
    const session = this.presenceService.getStudySession(data.groupId);
    client.emit('session:details', session);
  }

  @SubscribeMessage('session:pomodoro:control')
  handlePomodoroControl(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      groupId: string;
      isPaused: boolean;
      elapsedSeconds?: number;
      durationSeconds?: number;
    },
  ) {
    const session = this.presenceService.updatePomodoro(data.groupId, data);
    if (session) {
      this.server
        .to(`group:${data.groupId}`)
        .emit('session:pomodoro:update', session.pomodoro);
    }
  }

  @SubscribeMessage('session:tutor:prompt')
  handleSessionTutorPrompt(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string; prompt: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;
    const senderName = client.data.name || 'Collaborator';

    // Broadcast user query instantly to workspace room
    this.server.to(`group:${data.groupId}`).emit('session:tutor:message', {
      role: 'user',
      content: data.prompt,
      senderName,
    });

    this.presenceService.addTutorMessage(data.groupId, {
      role: 'user',
      content: data.prompt,
      senderName,
    });

    try {
      const systemInstruction = `You are a patient expert collaborative AI tutor assisting a student study group. Explain academic concepts masterfully and clearly using lists, headings, and LaTeX formatting where appropriate.`;
      const stream$ = this.aiEngine.stream(data.prompt, systemInstruction);

      let accumulated = '';
      stream$.subscribe({
        next: (chunk) => {
          accumulated += chunk;
          this.server
            .to(`group:${data.groupId}`)
            .emit('session:tutor:chunk', { chunk });
        },
        error: () => {
          this.server
            .to(`group:${data.groupId}`)
            .emit('session:tutor:message', {
              role: 'assistant',
              content:
                'Sorry, I encountered an issue processing the tutoring query.',
              senderName: 'AI Tutor',
            });
        },
        complete: () => {
          const assistantMsg = {
            role: 'assistant',
            content: accumulated,
            senderName: 'AI Tutor',
          };
          this.presenceService.addTutorMessage(data.groupId, assistantMsg);
          this.presenceService.incrementSessionStat(
            data.groupId,
            userId,
            'aiQuestions',
          );

          this.server
            .to(`group:${data.groupId}`)
            .emit('session:tutor:message', assistantMsg);

          const session = this.presenceService.getStudySession(data.groupId);
          if (session) {
            this.server
              .to(`group:${data.groupId}`)
              .emit('session:stats:update', session.stats);
          }
        },
      });
    } catch (e) {
      this.server.to(`group:${data.groupId}`).emit('session:tutor:message', {
        role: 'assistant',
        content: 'Failed to initialize tutoring request.',
        senderName: 'AI Tutor',
      });
    }
  }

  @SubscribeMessage('session:focus:change')
  handleSessionFocusChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string; focus: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    const session = this.presenceService.updateSessionFocus(
      data.groupId,
      userId,
      data.focus,
    );
    if (session) {
      this.server
        .to(`group:${data.groupId}`)
        .emit('session:focuses:update', session.focuses);
    }
  }

  @SubscribeMessage('session:stat:increment')
  handleSessionStatIncrement(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      groupId: string;
      statType:
        'aiQuestions' | 'filesOpened' | 'quizAttempts' | 'flashcardsReviewed';
    },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    const session = this.presenceService.incrementSessionStat(
      data.groupId,
      userId,
      data.statType,
    );
    if (session) {
      this.server
        .to(`group:${data.groupId}`)
        .emit('session:stats:update', session.stats);
    }
  }

  @SubscribeMessage('session:resource:sync')
  handleSessionResourceSync(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string; resource: any },
  ) {
    this.presenceService.setActiveResource(data.groupId, data.resource);
    this.server
      .to(`group:${data.groupId}`)
      .emit('session:resource:sync', data.resource);
  }

  @SubscribeMessage('session:resource:progress')
  handleSessionResourceProgress(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string; progress: any },
  ) {
    const session = this.presenceService.setActiveResourceProgress(
      data.groupId,
      data.progress,
    );
    if (session) {
      this.server
        .to(`group:${data.groupId}`)
        .emit('session:resource:progress', data.progress);
    }
  }

  @SubscribeMessage('group:activity:log')
  handleGroupActivityLog(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { groupId: string; type: string; userName: string; details?: any },
  ) {
    const activityItem = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: data.type,
      userName: data.userName,
      timestamp: new Date().toISOString(),
      details: data.details || {},
    };
    this.server
      .to(`group:${data.groupId}`)
      .emit('group:activity:log', activityItem);
  }

  @SubscribeMessage('whiteboard:draw')
  handleWhiteboardDraw(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      groupId: string;
      x: number;
      y: number;
      prevX: number;
      prevY: number;
      color: string;
      brushSize: number;
    },
  ) {
    this.server.to(`group:${data.groupId}`).emit('whiteboard:draw', data);
  }

  @SubscribeMessage('whiteboard:element')
  handleWhiteboardElement(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      groupId: string;
      action: 'add' | 'update' | 'delete' | 'reorder';
      pageId: string;
      element?: any;
      elementId?: string;
      elements?: any[];
    },
  ) {
    client.to(`group:${data.groupId}`).emit('whiteboard:element', data);
  }

  @SubscribeMessage('whiteboard:presentation')
  handleWhiteboardPresentation(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      groupId: string;
      presenterId: string;
      presenterName: string;
      zoom: number;
      pan: { x: number; y: number };
    },
  ) {
    client.to(`group:${data.groupId}`).emit('whiteboard:presentation', data);
  }

  @SubscribeMessage('whiteboard:clear')
  handleWhiteboardClear(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string },
  ) {
    this.server.to(`group:${data.groupId}`).emit('whiteboard:clear');
  }

  @SubscribeMessage('whiteboard:cursor')
  handleWhiteboardCursor(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      groupId: string;
      userId: string;
      userName: string;
      x: number;
      y: number;
      color: string;
      isLaser?: boolean;
    },
  ) {
    client.to(`group:${data.groupId}`).emit('whiteboard:cursor', data);
  }

  @SubscribeMessage('whiteboard:laser-point')
  handleWhiteboardLaserPoint(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      groupId: string;
      userId: string;
      userName: string;
      x: number;
      y: number;
      color: string;
    },
  ) {
    client.to(`group:${data.groupId}`).emit('whiteboard:laser-point', data);
  }

  @SubscribeMessage('whiteboard:update')
  handleWhiteboardUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string },
  ) {
    client.to(`group:${data.groupId}`).emit('whiteboard:updated', data);
  }

  @SubscribeMessage('voice:join')
  handleVoiceJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string; userId: string; userName: string },
  ) {
    client.join(`voice:${data.groupId}`);
    client.to(`voice:${data.groupId}`).emit('voice:user-joined', {
      userId: data.userId,
      userName: data.userName,
      socketId: client.id,
    });
  }

  @SubscribeMessage('voice:leave')
  handleVoiceLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string; userId: string },
  ) {
    client.leave(`voice:${data.groupId}`);
    client
      .to(`voice:${data.groupId}`)
      .emit('voice:user-left', { userId: data.userId });
  }

  @SubscribeMessage('voice:mute')
  handleVoiceMute(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string; userId: string; isMuted: boolean },
  ) {
    this.server.to(`voice:${data.groupId}`).emit('voice:mute', {
      userId: data.userId,
      socketId: client.id,
      isMuted: data.isMuted,
    });
  }

  @SubscribeMessage('voice:speaking')
  handleVoiceSpeaking(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { groupId: string; userId: string; isSpeaking: boolean },
  ) {
    this.server.to(`voice:${data.groupId}`).emit('voice:speaking', {
      userId: data.userId,
      socketId: client.id,
      isSpeaking: data.isSpeaking,
    });
  }

  @SubscribeMessage('voice:deafen')
  handleVoiceDeafen(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { groupId: string; userId: string; isDeafened: boolean },
  ) {
    this.server.to(`voice:${data.groupId}`).emit('voice:deafen', {
      userId: data.userId,
      socketId: client.id,
      isDeafened: data.isDeafened,
    });
  }

  @SubscribeMessage('voice:signal')
  handleVoiceSignal(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      targetSocketId: string;
      signal: any;
      senderUserId: string;
      senderUserName: string;
    },
  ) {
    this.server.to(data.targetSocketId).emit('voice:signal', {
      signal: data.signal,
      senderSocketId: client.id,
      senderUserId: data.senderUserId,
      senderUserName: data.senderUserName,
    });
  }

  @SubscribeMessage('editor:playground:change')
  handlePlaygroundChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string; code: string; language: string },
  ) {
    this.server
      .to(`group:${data.groupId}`)
      .emit('editor:playground:change', data);
  }

  @SubscribeMessage('editor:playground:cursor')
  handlePlaygroundCursor(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      groupId: string;
      userId: string;
      userName: string;
      position: { lineNumber: number; column: number };
    },
  ) {
    client.to(`group:${data.groupId}`).emit('editor:playground:cursor', data);
  }

  @SubscribeMessage('editor:edit')
  async handleEdit(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      noteId: string;
      change: { from: number; to: number; insert: string };
      version?: number;
      fullContent?: string;
    },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    try {
      const role = await this.notesCollabService.getNoteUserRole(
        userId,
        data.noteId,
      );
      if (role !== 'OWNER' && role !== 'EDITOR') {
        client.emit('error', 'You do not have write access to edit this note');
        return;
      }

      // Broadcast changes to other collaborators
      client.to(`note:${data.noteId}`).emit('editor:edit:update', {
        userId,
        change: data.change,
        version: data.version,
        fullContent: data.fullContent,
      });

      // Update database representation
      if (data.fullContent !== undefined) {
        await this.prisma.note.update({
          where: { id: data.noteId },
          data: {
            content: data.fullContent,
            markdown: data.fullContent,
            autoSaveContent: data.fullContent,
          },
        });
      }
    } catch (err: any) {
      this.logger.error(`Error in editor:edit: ${err.message}`);
    }
  }

  @SubscribeMessage('editor:cursor')
  handleCursor(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { noteId: string; cursor: { from: number; to: number } },
  ) {
    this.presenceService.updateNoteCursor(client.id, data.cursor);

    client.to(`note:${data.noteId}`).emit('editor:cursor:update', {
      userId: client.data.userId,
      email: client.data.email,
      name: client.data.name || 'Collaborator',
      cursorColor: client.data.cursorColor || '#8B5CF6',
      avatarUrl: client.data.avatarUrl,
      cursor: data.cursor,
    });
  }

  @SubscribeMessage('editor:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { noteId: string; isTyping: boolean },
  ) {
    client.to(`note:${data.noteId}`).emit('editor:typing:update', {
      userId: client.data.userId,
      email: client.data.email,
      name: client.data.name || 'Collaborator',
      isTyping: data.isTyping,
    });
  }
}
