import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LeaderboardService } from './leaderboard.service';

@Controller('leaderboard')
@UseGuards(JwtAuthGuard)
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get('weekly')
  async getWeekly(@Request() req: any) {
    const userId = req.user.id;
    // Recalculate ranks first to ensure movement metrics match
    await this.leaderboardService.recalculateRanks();
    return this.leaderboardService.getWeeklyLeaderboard(userId);
  }

  @Get('monthly')
  async getMonthly(@Request() req: any) {
    const userId = req.user.id;
    await this.leaderboardService.recalculateRanks();
    return this.leaderboardService.getMonthlyLeaderboard(userId);
  }

  @Get('friends')
  async getFriends(
    @Request() req: any,
    @Query('period') period: 'weekly' | 'monthly' | 'alltime' = 'weekly',
  ) {
    const userId = req.user.id;
    return this.leaderboardService.getFriendsLeaderboard(userId, period);
  }

  @Get('subject/:subject')
  async getSubject(@Param('subject') subject: string) {
    return this.leaderboardService.getSubjectLeaderboard(subject);
  }

  @Get('champions')
  async getChampions() {
    return this.leaderboardService.getHallOfChampions();
  }

  @Post('recalculate')
  async forceRecalculate() {
    await this.leaderboardService.recalculateRanks();
    return { success: true, message: 'Ranks computed successfully' };
  }

  @Post('reset/weekly')
  async resetWeekly() {
    await this.leaderboardService.triggerWeeklyReset();
    return { success: true, message: 'Weekly reset executed successfully' };
  }

  @Post('reset/monthly')
  async resetMonthly() {
    await this.leaderboardService.triggerMonthlyReset();
    return { success: true, message: 'Monthly reset executed successfully' };
  }
}
