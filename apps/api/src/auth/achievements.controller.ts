import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { AchievementEngineService } from './achievement-engine.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('achievements')
@UseGuards(JwtAuthGuard)
export class AchievementsController {
  constructor(private achievementEngine: AchievementEngineService) {}

  @Get()
  async getMyAchievements(@CurrentUser() user: any) {
    return this.achievementEngine.evaluateUserAchievements(user.id);
  }

  @Get('notifications')
  async getPendingNotifications(@CurrentUser() user: any) {
    return this.achievementEngine.getPendingUnlockedNotifications(user.id);
  }

  @Post(':id/acknowledge')
  async acknowledgeAchievement(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    await this.achievementEngine.acknowledgeAchievement(user.id, id);
    return { success: true };
  }
}
