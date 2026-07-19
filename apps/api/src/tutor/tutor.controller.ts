import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Sse,
  UseGuards,
  Param,
  Query,
  Body,
  MessageEvent,
  BadRequestException,
} from '@nestjs/common';
import { TutorService } from './tutor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Observable, map } from 'rxjs';

@Controller('tutor')
@UseGuards(JwtAuthGuard)
export class TutorController {
  constructor(private tutorService: TutorService) {}

  @Get('conversations')
  async listConversations(@CurrentUser() user: any) {
    return this.tutorService.listConversations(user.id);
  }

  @Post('conversations')
  async createConversation(
    @CurrentUser() user: any,
    @Body('title') title?: string,
  ) {
    return this.tutorService.createConversation(user.id, title);
  }

  @Get('conversations/:id')
  async getConversationDetails(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.tutorService.getConversationDetails(user.id, id);
  }

  @Delete('conversations/:id')
  async deleteConversation(@CurrentUser() user: any, @Param('id') id: string) {
    return this.tutorService.deleteConversation(user.id, id);
  }

  @Patch('conversations/:id')
  async renameConversation(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('title') title: string,
  ) {
    if (!title || !title.trim()) {
      throw new BadRequestException('Title cannot be empty');
    }
    return this.tutorService.renameConversation(user.id, id, title);
  }

  @Sse('conversations/:id/stream')
  async streamTutor(
    @CurrentUser() user: any,
    @Param('id') conversationId: string,
    @Query('prompt') prompt: string,
    @Query('noteId') noteId?: string,
    @Query('notebookId') notebookId?: string,
    @Query('mode') mode?: string,
  ): Promise<Observable<MessageEvent>> {
    const stream$ = await this.tutorService.streamTutorResponse(
      user.id,
      conversationId,
      prompt,
      {
        noteId,
        notebookId,
        mode,
      },
    );
    return stream$.pipe(map((chunk) => ({ data: chunk })));
  }
}
