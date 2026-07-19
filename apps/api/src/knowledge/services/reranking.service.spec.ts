import { Test, TestingModule } from '@nestjs/testing';
import { RerankingService } from './reranking.service';
import { MemoryService } from './memory.service';

describe('RerankingService', () => {
  let service: RerankingService;

  const mockMemoryService = {
    getOrCreateMemory: jest.fn().mockResolvedValue({
      weakTopics: ['calculus', 'derivatives'],
      strongTopics: [],
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RerankingService,
        { provide: MemoryService, useValue: mockMemoryService },
      ],
    }).compile();

    service = module.get<RerankingService>(RerankingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should boost score for chunks containing weak topics', async () => {
    const results = [
      {
        chunkId: '1',
        documentId: 'doc1',
        documentName: 'Calculus Notes.pdf',
        content: 'Understanding derivatives and limits in calculus.',
        pageNumber: 1,
        chunkIndex: 0,
        score: 0.5,
      },
      {
        chunkId: '2',
        documentId: 'doc2',
        documentName: 'History.pdf',
        content: 'Overview of European history.',
        pageNumber: 1,
        chunkIndex: 0,
        score: 0.5,
      },
    ];

    const reranked = await service.rerankResults('user1', results, 0.2);
    expect(reranked.length).toBe(2);
    expect(reranked[0].chunkId).toBe('1');
    expect(reranked[0].score).toBeGreaterThan(0.5);
  });
});
