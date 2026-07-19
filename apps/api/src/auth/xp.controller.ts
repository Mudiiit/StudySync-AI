import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { XpEngineService } from './xp-engine.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('xp')
@UseGuards(JwtAuthGuard)
export class XpController {
  constructor(private xpEngine: XpEngineService) {}

  @Get('timeline')
  async getXpTimeline(@CurrentUser() user: any) {
    return this.xpEngine.getXpTimeline(user.id);
  }

  @Get('statistics')
  async getXpStatistics(@CurrentUser() user: any) {
    return this.xpEngine.getXpStatistics(user.id);
  }

  @Get('level-up')
  async getLevelUpAlert(@CurrentUser() user: any) {
    return this.xpEngine.getLevelUpAlert(user.id);
  }

  @Post('level-up/acknowledge')
  async acknowledgeLevelUp(@CurrentUser() user: any) {
    await this.xpEngine.acknowledgeLevelUp(user.id);
    return { success: true };
  }
}
