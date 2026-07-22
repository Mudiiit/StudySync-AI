import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { XpEngineService } from '../auth/xp-engine.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('goals')
@UseGuards(JwtAuthGuard)
export class GoalsController {
  constructor(
    private prisma: PrismaService,
    private xpEngine: XpEngineService,
  ) {}

  @Get()
  async getGoals(@CurrentUser() user: any) {
    return this.prisma.goal.findMany({
      where: { userId: user.id },
      include: { milestones: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post()
  async createGoal(
    @CurrentUser() user: any,
    @Body()
    dto: {
      title: string;
      description?: string;
      targetDate: string;
      type: 'WEEKLY' | 'SEMESTER' | 'LONG_TERM';
      milestones?: string[];
    },
  ) {
    const goal = await this.prisma.goal.create({
      data: {
        userId: user.id,
        title: dto.title,
        description: dto.description || null,
        targetDate: new Date(dto.targetDate),
        type: dto.type,
        milestones: {
          create: (dto.milestones || []).map((m, idx) => ({
            title: m,
            order: idx,
          })),
        },
      },
      include: { milestones: true },
    });

    return goal;
  }

  @Patch(':id')
  async updateGoal(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body()
    dto: { title?: string; description?: string; isCompleted?: boolean },
  ) {
    const existingGoal = await this.prisma.goal.findUnique({
      where: { id },
    });

    if (!existingGoal || existingGoal.userId !== user.id) {
      throw new NotFoundException('Goal not found');
    }

    const goal = await this.prisma.goal.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        isCompleted: dto.isCompleted,
      },
    });

    // Check if goal was just completed
    if (
      dto.isCompleted === true &&
      (!existingGoal || !existingGoal.isCompleted)
    ) {
      await this.xpEngine.grantXp(
        user.id,
        'GOAL_COMPLETED',
        `Completed learning goal: ${goal.title}`,
      );
    }

    return goal;
  }

  @Patch(':id/milestones/:mileId')
  async toggleMilestone(
    @CurrentUser() user: any,
    @Param('id') goalId: string,
    @Param('mileId') mileId: string,
    @Body('isCompleted') isCompleted: boolean,
  ) {
    const milestone = await this.prisma.goalMilestone.findUnique({
      where: { id: mileId },
      include: { goal: true },
    });

    if (!milestone || milestone.goal.userId !== user.id) {
      throw new NotFoundException('Milestone not found');
    }

    await this.prisma.goalMilestone.update({
      where: { id: mileId },
      data: { isCompleted },
    });

    // Fetch all milestones for this goal to see if they are all completed
    const goal = await this.prisma.goal.findUnique({
      where: { id: goalId },
      include: { milestones: true },
    });

    if (goal && !goal.isCompleted) {
      const allDone = goal.milestones.every((m) => m.isCompleted);
      if (allDone && goal.milestones.length > 0) {
        // Complete the goal and grant XP!
        await this.prisma.goal.update({
          where: { id: goalId },
          data: { isCompleted: true },
        });

        await this.xpEngine.grantXp(
          user.id,
          'GOAL_COMPLETED',
          `Completed all milestones for goal: ${goal.title}`,
        );
      }
    }

    return this.prisma.goal.findUnique({
      where: { id: goalId },
      include: { milestones: { orderBy: { order: 'asc' } } },
    });
  }

  @Delete(':id')
  async deleteGoal(@CurrentUser() user: any, @Param('id') id: string) {
    const existingGoal = await this.prisma.goal.findUnique({
      where: { id },
    });

    if (!existingGoal || existingGoal.userId !== user.id) {
      throw new NotFoundException('Goal not found');
    }

    return this.prisma.goal.delete({
      where: { id },
    });
  }
}
