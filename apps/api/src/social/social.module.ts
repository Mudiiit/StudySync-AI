import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StatusService } from './status.service';
import { FriendsController } from './friends.controller';
import { GroupsController } from './groups.controller';
import { ChallengesController } from './challenges.controller';
import { NotebooksController } from './notebooks.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    FriendsController,
    GroupsController,
    ChallengesController,
    NotebooksController,
  ],
  providers: [StatusService],
  exports: [StatusService],
})
export class SocialModule {}
