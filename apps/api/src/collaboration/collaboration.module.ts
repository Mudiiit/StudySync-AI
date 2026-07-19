import { Module } from '@nestjs/common';
import { CollaborationGateway } from './collaboration.gateway';
import { PresenceService } from './services/presence.service';
import { WorkspaceService } from './services/workspace.service';
import { GroupChatService } from './services/group-chat.service';
import { NotesCollaborationService } from './services/notes-collaboration.service';
import { CollaborationController } from './collaboration.controller';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    JwtModule.register({
      secret:
        process.env.JWT_ACCESS_SECRET ||
        process.env.JWT_SECRET ||
        'super-secret-key',
    }),
    NotificationsModule,
    AuthModule,
    StorageModule,
  ],
  controllers: [CollaborationController],
  providers: [
    CollaborationGateway,
    PresenceService,
    WorkspaceService,
    GroupChatService,
    NotesCollaborationService,
  ],
  exports: [
    CollaborationGateway,
    PresenceService,
    WorkspaceService,
    GroupChatService,
    NotesCollaborationService,
  ],
})
export class CollaborationModule {}
