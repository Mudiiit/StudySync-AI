import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Sse,
  MessageEvent,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { CreateFolderDto } from './dto/folder.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AiService } from '../ai/ai.service';
import { NotesRepository } from './repositories/notes.repository';
import { XpEngineService } from '../auth/xp-engine.service';

@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(
    private notesService: NotesService,
    private notesRepo: NotesRepository,
    private aiService: AiService,
    private xpEngine: XpEngineService,
  ) {}

  // ==========================================
  // FOLDERS
  // ==========================================

  @Get('folders')
  async getFolders(@CurrentUser() user: any) {
    return this.notesService.getFolders(user.id);
  }

  @Post('folders')
  async createFolder(@CurrentUser() user: any, @Body() dto: CreateFolderDto) {
    return this.notesService.createFolder(user.id, dto);
  }

  @Delete('folders/:id')
  async deleteFolder(@CurrentUser() user: any, @Param('id') id: string) {
    return this.notesService.deleteFolder(user.id, id);
  }

  // ==========================================
  // NOTES
  // ==========================================

  @Get()
  async getNotes(
    @CurrentUser() user: any,
    @Query('folderId') folderId?: string,
    @Query('notebookId') notebookId?: string,
    @Query('isPinned') isPinned?: string,
    @Query('isFavorite') isFavorite?: string,
    @Query('favorite') favorite?: string,
    @Query('archived') archived?: string,
    @Query('deleted') deleted?: string,
    @Query('inTrash') inTrash?: string,
    @Query('tag') tag?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.notesService.getNotes(user.id, {
      folderId,
      notebookId,
      isPinned:
        isPinned === 'true' ? true : isPinned === 'false' ? false : undefined,
      isFavorite:
        isFavorite === 'true'
          ? true
          : isFavorite === 'false'
            ? false
            : undefined,
      favorite:
        favorite === 'true' ? true : favorite === 'false' ? false : undefined,
      archived:
        archived === 'true' ? true : archived === 'false' ? false : undefined,
      deleted:
        deleted === 'true' ? true : deleted === 'false' ? false : undefined,
      inTrash:
        inTrash === 'true' ? true : inTrash === 'false' ? false : undefined,
      tag,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      sortBy,
      sortOrder,
    });
  }

  @Get(':id')
  async getNote(@CurrentUser() user: any, @Param('id') id: string) {
    return this.notesService.getNote(user.id, id);
  }

  @Post()
  async createNote(@CurrentUser() user: any, @Body() dto: CreateNoteDto) {
    const note = await this.notesService.createNote(user.id, dto);
    this.xpEngine
      .grantXp(user.id, 'NOTE_CREATED', `Created study note: ${note.title}`)
      .catch(console.error);
    return note;
  }

  @Patch(':id')
  async updateNote(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateNoteDto,
  ) {
    console.log(
      '[NotesController] PATCH /notes/:id received. noteId:',
      id,
      'dto:',
      dto,
    );
    const result = await this.notesService.updateNote(user.id, id, dto);
    console.log(
      '[NotesController] PATCH /notes/:id success. returned note title:',
      result?.title,
    );
    return result;
  }

  @Post(':id/favorite')
  async toggleFavorite(@CurrentUser() user: any, @Param('id') id: string) {
    return this.notesService.toggleFavorite(user.id, id);
  }

  @Post(':id/archive')
  async toggleArchive(@CurrentUser() user: any, @Param('id') id: string) {
    return this.notesService.toggleArchive(user.id, id);
  }

  @Post(':id/trash')
  async toggleSoftDelete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.notesService.toggleSoftDelete(user.id, id);
  }

  @Post(':id/autosave')
  async autoSave(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('content') content: string,
  ) {
    return this.notesService.autoSave(user.id, id, content);
  }

  @Get(':id/versions')
  async getVersions(@CurrentUser() user: any, @Param('id') id: string) {
    return this.notesService.getVersions(user.id, id);
  }

  @Post(':id/versions/:versionId/restore')
  async restoreVersion(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.notesService.restoreVersion(user.id, id, versionId);
  }

  // ==========================================
  // AI ENDPOINTS
  // ==========================================

  @Post(':id/ai')
  async processAi(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('action') action: string,
    @Body('language') language?: string,
  ) {
    return this.notesService.processAiAction(user.id, id, action, language);
  }

  @Sse(':id/ai/stream')
  async streamAi(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('action') action: string,
  ): Promise<Observable<MessageEvent>> {
    // Verify permission first
    const note = await this.notesRepo.findNoteById(user.id, id);
    if (!note) {
      throw new UnauthorizedException('Access denied');
    }

    let stream$: Observable<string>;
    switch (action) {
      case 'summarize':
        stream$ = this.aiService.streamSummarize(note.content);
        break;
      case 'explain':
        stream$ = this.aiService.streamExplain(note.content);
        break;
      case 'rewrite':
        stream$ = this.aiService.streamRewrite(note.content);
        break;
      default:
        throw new NotFoundException(
          `AI Action '${action}' is not supported for streaming`,
        );
    }

    return stream$.pipe(map((chunk) => ({ data: chunk })));
  }
}
