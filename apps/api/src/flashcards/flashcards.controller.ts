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
  ParseIntPipe,
  ParseBoolPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FlashcardsService } from './flashcards.service';

import { XpEngineService } from '../auth/xp-engine.service';

@Controller('flashcards')
@UseGuards(JwtAuthGuard)
export class FlashcardsController {
  constructor(
    private service: FlashcardsService,
    private xpEngine: XpEngineService,
  ) {}

  // ==========================================
  // AI GENERATION
  // ==========================================

  @Post('generate/note/:noteId')
  async generateFromNote(
    @CurrentUser() user: any,
    @Param('noteId') noteId: string,
    @Body('type') type: 'recall' | 'conceptual' | 'scenario' | 'interview',
    @Body('quantity', new DefaultValuePipe(5), ParseIntPipe) quantity: number,
  ) {
    console.log(
      '[FlashcardsController] POST /flashcards/generate/note/:noteId received. noteId:',
      noteId,
    );
    const result = await this.service.generateFromNote(
      user.id,
      noteId,
      type,
      quantity,
    );
    this.xpEngine
      .grantXp(
        user.id,
        'FLASHCARDS_GENERATED',
        'Generated Flashcards from Note',
      )
      .catch(console.error);
    return result;
  }

  @Post('generate/selection')
  async generateFromSelection(
    @CurrentUser() user: any,
    @Body()
    dto: {
      text: string;
      noteId?: string;
      notebookId?: string;
      type: 'recall' | 'conceptual' | 'scenario' | 'interview';
      quantity: number;
    },
  ) {
    const result = await this.service.generateFromSelection(user.id, dto);
    this.xpEngine
      .grantXp(
        user.id,
        'FLASHCARDS_GENERATED',
        'Generated Flashcards from Selection',
      )
      .catch(console.error);
    return result;
  }

  @Post('generate/notebook/:notebookId')
  async generateFromNotebook(
    @CurrentUser() user: any,
    @Param('notebookId') notebookId: string,
    @Body('type') type: 'recall' | 'conceptual' | 'scenario' | 'interview',
    @Body('quantity', new DefaultValuePipe(5), ParseIntPipe) quantity: number,
  ) {
    const result = await this.service.generateFromNotebook(
      user.id,
      notebookId,
      type,
      quantity,
    );
    this.xpEngine
      .grantXp(
        user.id,
        'FLASHCARDS_GENERATED',
        'Generated Flashcards from Notebook',
      )
      .catch(console.error);
    return result;
  }

  // ==========================================
  // SPACED REPETITION REVIEW SESSIONS
  // ==========================================

  @Get('due')
  async getDueCards(@CurrentUser() user: any) {
    return this.service.getDueCards(user.id);
  }

  @Post(':id/review')
  async reviewCard(
    @CurrentUser() user: any,
    @Param('id') cardId: string,
    @Body('rating', ParseIntPipe) rating: number,
  ) {
    return this.service.reviewCard(user.id, cardId, rating);
  }

  @Get('stats')
  async getStats(@CurrentUser() user: any) {
    return this.service.getStats(user.id);
  }

  // ==========================================
  // CRUD INTERFACES
  // ==========================================

  @Get()
  async getFlashcards(
    @CurrentUser() user: any,
    @Query('search') search?: string,
    @Query('notebookId') notebookId?: string,
    @Query('noteId') noteId?: string,
    @Query('deckId') deckId?: string,
    @Query('difficulty') difficulty?: string,
    @Query('aiGenerated') aiGeneratedStr?: string,
    @Query('isFavorite') isFavoriteStr?: string,
    @Query('tag') tag?: string,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const aiGenerated =
      aiGeneratedStr === 'true'
        ? true
        : aiGeneratedStr === 'false'
          ? false
          : undefined;
    const isFavorite =
      isFavoriteStr === 'true'
        ? true
        : isFavoriteStr === 'false'
          ? false
          : undefined;
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 20;

    return this.service.findAll(user.id, {
      search,
      notebookId,
      noteId,
      deckId,
      difficulty,
      aiGenerated,
      isFavorite,
      tag,
      page,
      limit,
    });
  }

  @Get(':id')
  async getOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.findOne(user.id, id);
  }

  @Post()
  async create(
    @CurrentUser() user: any,
    @Body()
    dto: {
      question: string;
      answer: string;
      hint?: string;
      explanation?: string;
      difficulty?: string;
      tags?: string[];
      noteId?: string;
      notebookId?: string;
    },
  ) {
    return this.service.create(user.id, dto);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body()
    dto: {
      question?: string;
      answer?: string;
      hint?: string;
      explanation?: string;
      difficulty?: string;
      tags?: string[];
      isFavorite?: boolean;
    },
  ) {
    return this.service.update(user.id, id, dto);
  }

  @Delete(':id')
  async delete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.delete(user.id, id);
  }
}
