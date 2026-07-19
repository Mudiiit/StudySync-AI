import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { AchievementsController } from './achievements.controller';
import { AchievementEngineService } from './achievement-engine.service';
import { XpController } from './xp.controller';
import { XpEngineService } from './xp-engine.service';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import { ConfigModule } from '@nestjs/config';
import { StorageModule } from '../storage/storage.module';
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    ConfigModule,
    forwardRef(() => StorageModule),
  ],
  controllers: [
    AuthController,
    ProfileController,
    AchievementsController,
    XpController,
    LeaderboardController,
  ],
  providers: [
    AuthService,
    ProfileService,
    AchievementEngineService,
    XpEngineService,
    LeaderboardService,
    JwtStrategy,
    GoogleStrategy,
    GithubStrategy,
  ],
  exports: [
    AuthService,
    PassportModule,
    ProfileService,
    AchievementEngineService,
    XpEngineService,
    LeaderboardService,
  ],
})
export class AuthModule {}
