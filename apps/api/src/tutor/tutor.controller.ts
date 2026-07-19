import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  UseGuards,
  Param,
  Body,
  Res,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { TutorService } from './tutor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ChatPromptDto } from './dto/chat-prompt.dto';
import { RenameChatDto } from './dto/rename-chat.dto';
import * as express from 'express';
import { Subject } from 'rxjs';

@Controller('tutor')
@UseGuards(JwtAuthGuard)
export class TutorController {
  constructor(private tutorService: TutorService) {}

  @Post('chat')
  async chat(
    @CurrentUser() user: any,
    @Body() dto: ChatPromptDto,
    @Res() res: express.Response,
    @Req() req: express.Request,
  ) {
    const clientDisconnected$ = new Subject<void>();
    req.on('close', () => {
      clientDisconnected$.next();
      clientDisconnected$.complete();
    });
    return this.tutorService.streamTutorResponse(
      user.id,
      dto,
      res,
      clientDisconnected$,
    );
  }

  @Get('history')
  async listConversations(@CurrentUser() user: any) {
    return this.tutorService.listConversations(user.id);
  }

  @Get('history/:id')
  async getConversationDetails(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.tutorService.getConversationDetails(user.id, id);
  }

  @Delete('history/:id')
  async deleteConversation(@CurrentUser() user: any, @Param('id') id: string) {
    return this.tutorService.deleteConversation(user.id, id);
  }

  @Patch('history/:id')
  async renameConversation(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: RenameChatDto,
  ) {
    return this.tutorService.renameConversation(user.id, id, dto.title);
  }

  @Post('regenerate')
  async regenerate(
    @CurrentUser() user: any,
    @Body('conversationId') conversationId: string,
    @Res() res: express.Response,
    @Req() req: express.Request,
  ) {
    if (!conversationId) {
      throw new BadRequestException('Conversation ID is required');
    }
    const clientDisconnected$ = new Subject<void>();
    req.on('close', () => {
      clientDisconnected$.next();
      clientDisconnected$.complete();
    });
    return this.tutorService.regenerateResponse(user.id, conversationId, res);
  }

  @Post('stop')
  stop(
    @CurrentUser() user: any,
    @Body('conversationId') conversationId: string,
  ) {
    if (!conversationId) {
      throw new BadRequestException('Conversation ID is required');
    }
    return this.tutorService.stopActiveStream(user.id, conversationId);
  }
}
