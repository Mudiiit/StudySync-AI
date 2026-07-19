import { Module } from '@nestjs/common';
import { NotesService } from './notes.service';
import { NotesController } from './notes.controller';
import { NotesRepository } from './repositories/notes.repository';
import { NotebooksController } from './notebooks.controller';
import { NotebooksService } from './notebooks.service';
import { NotebooksRepository } from './repositories/notebooks.repository';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AiModule, AuthModule],
  controllers: [NotesController, NotebooksController],
  providers: [
    NotesService,
    NotesRepository,
    NotebooksService,
    NotebooksRepository,
  ],
  exports: [NotesService, NotebooksService],
})
export class NotesModule {}
