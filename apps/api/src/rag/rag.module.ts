import { Module } from '@nestjs/common';
import { RagController } from './rag.controller';
import { RagService } from './services/rag.service';
import { EmbeddingsService } from './services/embeddings.service';
import { ChunkingService } from './services/chunking.service';
import { PdfParser } from './providers/pdf-parser.provider';
import { DocxParser } from './providers/docx-parser.provider';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [RagController],
  providers: [
    RagService,
    EmbeddingsService,
    ChunkingService,
    PdfParser,
    DocxParser,
  ],
  exports: [
    RagService,
    EmbeddingsService,
    ChunkingService,
    PdfParser,
    DocxParser,
  ],
})
export class RagModule {}
