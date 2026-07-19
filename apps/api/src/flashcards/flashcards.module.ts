import { Module } from '@nestjs/common';
import { FlashcardsService } from './flashcards.service';
import { FlashcardsController } from './flashcards.controller';
import { FlashcardAiService } from './flashcard-ai.service';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AiModule, AuthModule],
  controllers: [FlashcardsController],
  providers: [FlashcardsService, FlashcardAiService],
  exports: [FlashcardsService],
})
export class FlashcardsModule {}
