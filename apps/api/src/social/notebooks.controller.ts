import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('social/notebooks')
@UseGuards(JwtAuthGuard)
export class NotebooksController {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // GET SHARED NOTEBOOKS
  // ==========================================
  @Get('shared')
  async getSharedNotebooks(@Request() req: any) {
    const userId = req.user.id;

    const list = await this.prisma.sharedNotebookPermission.findMany({
      where: { userId },
      include: {
        notebook: {
          include: {
            user: { include: { profile: true } },
          },
        },
      },
    });

    return list.map((item) => ({
      notebook: item.notebook,
      role: item.role,
      ownerName:
        item.notebook.user.profile?.displayName ||
        item.notebook.user.profile?.firstName ||
        'Owner',
    }));
  }

  // ==========================================
  // SHARE NOTEBOOK
  // ==========================================
  @Post(':id/share')
  async shareNotebook(
    @Request() req: any,
    @Param('id') notebookId: string,
    @Body()
    body: { targetUserId: string; role: 'VIEWER' | 'COMMENTER' | 'EDITOR' },
  ) {
    const userId = req.user.id;
    const targetUserId = body.targetUserId;

    if (userId === targetUserId) {
      throw new BadRequestException('Cannot share with yourself');
    }

    // Security Block check
    const block = await this.prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: userId },
        ],
      },
    });
    if (block) throw new ForbiddenException('Blocked interactions restricted');

    // Verify notebook ownership
    const notebook = await this.prisma.notebook.findUnique({
      where: { id: notebookId },
    });
    if (!notebook) throw new NotFoundException('Notebook not found');
    if (notebook.userId !== userId) {
      throw new ForbiddenException('Only owners can share notebooks');
    }

    // Upsert permission
    const permission = await this.prisma.sharedNotebookPermission.upsert({
      where: { notebookId_userId: { notebookId, userId: targetUserId } },
      update: { role: body.role },
      create: { notebookId, userId: targetUserId, role: body.role },
    });

    // Notify target user
    const ownerProfile = await this.prisma.profile.findUnique({
      where: { userId },
    });
    await this.prisma.notification.create({
      data: {
        userId: targetUserId,
        title: 'Notebook Shared',
        message: `@${ownerProfile?.username || 'someone'} shared the notebook "${notebook.title}" with you as ${body.role}.`,
        type: 'NOTEBOOK_INVITE',
      },
    });

    return permission;
  }

  // ==========================================
  // REVOKE SHARE PERMISSION
  // ==========================================
  @Delete(':id/share/:targetUserId')
  async revokeShare(
    @Request() req: any,
    @Param('id') notebookId: string,
    @Param('targetUserId') targetUserId: string,
  ) {
    const userId = req.user.id;

    const notebook = await this.prisma.notebook.findUnique({
      where: { id: notebookId },
    });
    if (!notebook) throw new NotFoundException('Notebook not found');
    if (notebook.userId !== userId && targetUserId !== userId) {
      throw new ForbiddenException('Unauthorized revoke');
    }

    await this.prisma.sharedNotebookPermission.delete({
      where: { notebookId_userId: { notebookId, userId: targetUserId } },
    });

    return { success: true };
  }
}
