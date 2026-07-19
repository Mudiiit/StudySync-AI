import { Test, TestingModule } from '@nestjs/testing';
import { ChunkingService } from './chunking.service';

describe('ChunkingService', () => {
  let service: ChunkingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChunkingService],
    }).compile();

    service = module.get<ChunkingService>(ChunkingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('chunkText', () => {
    it('should split page text content into chunk frames with overlap offsets', () => {
      const pages = [
        {
          page: 1,
          text: 'This is page one text that needs chunking. It contains various definitions and formulas.',
        },
      ];

      const chunks = service.chunkText(pages, 30, 10);
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].pageNumber).toBe(1);
      expect(chunks[0].text.length).toBeLessThanOrEqual(30);
    });
  });
});
