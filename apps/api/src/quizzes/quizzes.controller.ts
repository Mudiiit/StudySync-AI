import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GenerateQuizDto } from './dto/generate-quiz.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { XpEngineService } from '../auth/xp-engine.service';
import { Difficulty } from '@prisma/client';

@Controller('quizzes')
@UseGuards(JwtAuthGuard)
export class QuizzesController {
  constructor(
    private readonly quizzesService: QuizzesService,
    private readonly xpEngine: XpEngineService,
  ) {}

  @Post('generate/note/:noteId')
  async generateFromNote(
    @CurrentUser() user: any,
    @Param('noteId') noteId: string,
    @Body() dto: GenerateQuizDto,
  ) {
    return this.quizzesService.generateQuizFromNote(user.id, noteId, dto);
  }

  @Post('generate/notebook/:notebookId')
  async generateFromNotebook(
    @CurrentUser() user: any,
    @Param('notebookId') notebookId: string,
    @Body() dto: GenerateQuizDto,
  ) {
    return this.quizzesService.generateQuizFromNotebook(
      user.id,
      notebookId,
      dto,
    );
  }

  @Post('generate/selection')
  async generateFromSelection(
    @CurrentUser() user: any,
    @Body('text') text: string,
    @Body('questionCount') questionCount: number,
    @Body('difficulty') difficulty: Difficulty,
  ) {
    if (!text || !text.trim()) {
      throw new BadRequestException('Text is required to generate quiz');
    }
    const dto: GenerateQuizDto = {
      questionCount: questionCount || 5,
      difficulty: difficulty || Difficulty.MEDIUM,
    };
    return this.quizzesService.generateQuizFromSelection(user.id, text, dto);
  }

  @Get()
  async getQuizzes(@CurrentUser() user: any) {
    return this.quizzesService.getQuizzes(user.id);
  }

  @Get('history')
  async getAttemptsHistory(@CurrentUser() user: any) {
    return this.quizzesService.getAttemptsHistory(user.id);
  }

  @Get('attempts/:attemptId')
  async getAttempt(
    @CurrentUser() user: any,
    @Param('attemptId') attemptId: string,
  ) {
    return this.quizzesService.getAttempt(user.id, attemptId);
  }

  @Get(':id')
  async getQuiz(@CurrentUser() user: any, @Param('id') id: string) {
    return this.quizzesService.getQuiz(user.id, id);
  }

  @Delete(':id')
  async deleteQuiz(@CurrentUser() user: any, @Param('id') id: string) {
    return this.quizzesService.deleteQuiz(user.id, id);
  }

  @Post(':id/start')
  async startAttempt(@CurrentUser() user: any, @Param('id') id: string) {
    return this.quizzesService.startAttempt(user.id, id);
  }

  @Post(':id/submit')
  async submitAttempt(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: SubmitQuizDto,
  ) {
    const attempt = await this.quizzesService.submitAttempt(user.id, id, dto);

    this.xpEngine
      .grantXp(user.id, 'QUIZ_COMPLETED', `Completed Quiz`)
      .catch(console.error);

    if (attempt && attempt.percentage === 100) {
      this.xpEngine
        .grantXp(user.id, 'QUIZ_PERFECT', `Perfect Quiz Score! (100%)`)
        .catch(console.error);
    }

    return attempt;
  }
}
