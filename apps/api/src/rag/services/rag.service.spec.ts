import { Test, TestingModule } from '@nestjs/testing';
import { RagService } from './rag.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmbeddingsService } from './embeddings.service';
import { AiEngine } from '../../ai/ai.engine';

describe('RagService', () => {
  let service: RagService;

  const mockPrismaService = {
    document: {
      findMany: jest
        .fn()
        .mockResolvedValue([{ id: 'doc-1', name: 'Syllabus.pdf' }]),
    },
    documentVector: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'v-1',
          documentId: 'doc-1',
          contentChunk: 'Calculus covers integrals',
          pageNumber: 3,
          embedding: [0.1, 0.2, 0.3],
        },
        {
          id: 'v-2',
          documentId: 'doc-1',
          contentChunk: 'History covers dates',
          pageNumber: 5,
          embedding: [-0.1, -0.2, -0.3],
        },
      ]),
    },
  };

  const mockEmbeddingsService = {
    generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  };

  const mockAiEngine = {
    generate: jest.fn().mockResolvedValue('Mocked Grounded Q&A Answer'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmbeddingsService, useValue: mockEmbeddingsService },
        { provide: AiEngine, useValue: mockAiEngine },
      ],
    }).compile();

    service = module.get<RagService>(RagService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('answerQuestion', () => {
    it('should query query-embedding, load database vectors, perform cosine similarity, and prompt grounding engine', async () => {
      const res = await service.answerQuestion(
        'user-1',
        ['doc-1'],
        'What is calculus?',
      );
      expect(res.response).toBe('Mocked Grounded Q&A Answer');
      expect(res.citations.length).toBe(1);
      expect(res.citations[0].documentName).toBe('Syllabus.pdf');
      expect(res.citations[0].pageNumber).toBe(3);
    });
  });
});
