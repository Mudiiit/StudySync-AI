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

  it('should chunk plain text recursively', () => {
    const text =
      'Paragraph 1 content here.\n\nParagraph 2 content here.\n\nParagraph 3 content here.';
    const chunks = service.chunkDocument(text, 'text/plain', 50, 10);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].content).toContain('Paragraph 1');
  });

  it('should chunk markdown files preserving headers', () => {
    const mdText =
      '# Chapter 1\nSome introductory text.\n\n## Section 1.1\nMore detailed analysis.';
    const chunks = service.chunkDocument(mdText, 'text/markdown', 100, 20);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].metadata?.inferredHeading).toBe('Chapter 1');
  });

  it('should chunk code files by line boundaries', () => {
    const code =
      'function calculateTotal(a, b) {\n  return a + b;\n}\n\nfunction multiply(a, b) {\n  return a * b;\n}';
    const chunks = service.chunkDocument(
      code,
      'application/javascript',
      60,
      10,
    );
    expect(chunks.length).toBeGreaterThan(0);
  });
});
