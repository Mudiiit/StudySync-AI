import {
  Controller,
  Get,
  Post,
  Patch,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { StorageService } from '../storage/storage.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(
    private profileService: ProfileService,
    private storageService: StorageService,
  ) {}

  @Get('me')
  async getMyProfile(@CurrentUser() user: any) {
    return this.profileService.getProfile(user.id, user.id);
  }

  @Get('username/check')
  async checkUsernameAvailability(@Query('username') username: string) {
    if (!username) {
      throw new BadRequestException('Username query parameter is required');
    }
    return this.profileService.checkUsernameAvailability(username);
  }

  @Get(':idOrUsername')
  async getProfile(
    @CurrentUser() user: any,
    @Param('idOrUsername') idOrUsername: string,
  ) {
    return this.profileService.getProfile(idOrUsername, user.id);
  }

  @Patch()
  async updateProfile(
    @CurrentUser() user: any,
    @Body() dto: { displayName?: string; bio?: string; timezone?: string },
  ) {
    return this.profileService.updateProfile(user.id, dto);
  }

  @Patch('username')
  async updateUsername(
    @CurrentUser() user: any,
    @Body('username') username: string,
  ) {
    if (!username) {
      throw new BadRequestException('Username field is required');
    }
    return this.profileService.updateUsername(user.id, username);
  }

  @Patch('privacy')
  async updatePrivacySettings(
    @CurrentUser() user: any,
    @Body()
    dto: {
      privacyLevel?: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE';
      showStudyHours?: boolean;
      showStreak?: boolean;
      showBadges?: boolean;
      showNotes?: boolean;
      showAchievements?: boolean;
    },
  ) {
    return this.profileService.updatePrivacySettings(user.id, dto);
  }

  @Post('avatar/library')
  async selectBuiltInAvatar(
    @CurrentUser() user: any,
    @Body('avatarUrl') avatarUrl: string,
  ) {
    if (!avatarUrl) {
      throw new BadRequestException('Avatar URL is required');
    }
    return this.profileService.selectBuiltInAvatar(user.id, avatarUrl);
  }

  @Post('avatar/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(@CurrentUser() user: any, @UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No file upload detected');
    }
    const fileUrl = await this.storageService.uploadAvatar(
      user.id,
      file.buffer,
      file.mimetype,
    );
    return this.profileService.selectBuiltInAvatar(user.id, fileUrl);
  }
}
