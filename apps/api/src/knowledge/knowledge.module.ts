import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { StorageModule } from '../storage/storage.module';
import { RagModule } from '../rag/rag.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

import { KnowledgeController } from './controllers/knowledge.controller';
import { KnowledgeService } from './services/knowledge.service';
import { RetrievalService } from './services/retrieval.service';
import { RerankingService } from './services/reranking.service';
import { MemoryService } from './services/memory.service';
import { ChunkingService } from './chunking/chunking.service';
import { TextCleaner } from './utils/text-cleaner';
import { EmbeddingsService } from './embeddings/embeddings.service';
import { GeminiEmbeddingProvider } from './embeddings/providers/gemini.provider';
import { OpenAIEmbeddingProvider } from './embeddings/providers/openai.provider';
import { KnowledgeIndexingWorker } from './workers/knowledge-indexing.worker';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    RagModule,
    AuthModule,
    RedisModule,
    BullModule.registerQueue({
      name: 'knowledge-queue',
    }),
  ],
  controllers: [KnowledgeController],
  providers: [
    KnowledgeService,
    RetrievalService,
    RerankingService,
    MemoryService,
    ChunkingService,
    TextCleaner,
    EmbeddingsService,
    GeminiEmbeddingProvider,
    OpenAIEmbeddingProvider,
    KnowledgeIndexingWorker,
  ],
  exports: [
    KnowledgeService,
    RetrievalService,
    RerankingService,
    MemoryService,
  ],
})
export class KnowledgeModule {}
