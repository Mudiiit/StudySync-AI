import { Module, Global } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiEngine } from './ai.engine';
import { PromptService } from './prompt.service';
import { MemoryService } from './memory.service';
import { AiController } from './ai.controller';

// Provider implementations
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAiProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { LocalLlmProvider } from './providers/local-llm.provider';

// Reusable business intelligence services
import { StudyPlannerService } from './services/study-planner.service';
import { TaskOptimizerService } from './services/task-optimizer.service';
import { NotesIntelService } from './services/notes-intel.service';
import { QuizGenService } from './services/quiz-gen.service';
import { FlashcardGenService } from './services/flashcard-gen.service';

// Queue Worker
import { AiWorker } from '../queues/workers/ai.worker';
import { RagModule } from '../rag/rag.module';

import { AuthModule } from '../auth/auth.module';

@Global()
@Module({
  imports: [RagModule, AuthModule],
  controllers: [AiController],
  providers: [
    AiService,
    AiEngine,
    PromptService,
    MemoryService,

    // Providers
    GeminiProvider,
    OpenAiProvider,
    AnthropicProvider,
    LocalLlmProvider,

    // Services
    StudyPlannerService,
    TaskOptimizerService,
    NotesIntelService,
    QuizGenService,
    FlashcardGenService,

    // Workers
    AiWorker,
  ],
  exports: [
    AiService,
    AiEngine,
    PromptService,
    MemoryService,
    StudyPlannerService,
    TaskOptimizerService,
    NotesIntelService,
    QuizGenService,
    FlashcardGenService,
  ],
})
export class AiModule {}
