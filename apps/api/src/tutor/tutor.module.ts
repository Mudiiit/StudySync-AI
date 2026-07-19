import { Module } from '@nestjs/common';
import { TutorController } from './tutor.controller';
import { TutorService } from './tutor.service';
import { TutorPromptBuilder } from './services/tutor-prompt.builder';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [TutorController],
  providers: [TutorService, TutorPromptBuilder],
  exports: [TutorService],
})
export class TutorModule {}
