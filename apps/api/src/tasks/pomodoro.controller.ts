import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { XpEngineService } from '../auth/xp-engine.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('pomodoro')
@UseGuards(JwtAuthGuard)
export class PomodoroController {
  constructor(
    private prisma: PrismaService,
    private xpEngine: XpEngineService,
  ) {}

  @Post()
  async createSession(
    @CurrentUser() user: any,
    @Body()
    dto: { durationMinutes: number; taskId?: string; soundUsed?: string },
  ) {
    const duration = dto.durationMinutes || 25;

    // 1. Save session to database
    const session = await this.prisma.pomodoroSession.create({
      data: {
        userId: user.id,
        taskId: dto.taskId || null,
        durationMinutes: duration,
        completed: true,
        soundUsed: dto.soundUsed || null,
      },
    });

    // 2. Grant session completion XP (+25 XP)
    await this.xpEngine.grantXp(
      user.id,
      'POMODORO_COMPLETED',
      `Completed Pomodoro focus session (${duration}m)`,
    );

    // 3. Grant study duration XP (+1 XP per minute, e.g. 60m = +60 XP)
    await this.xpEngine.grantXp(
      user.id,
      'STUDY_HOUR',
      `Studied for ${duration} minutes`,
      duration,
    );

    return session;
  }
}
