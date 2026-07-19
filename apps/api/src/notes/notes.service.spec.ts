import { Test, TestingModule } from '@nestjs/testing';
import { NotesService } from './notes.service';
import { NotesRepository } from './repositories/notes.repository';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';

describe('NotesService', () => {
  let service: NotesService;

  const mockNotesRepo = {
    findFoldersByUser: jest.fn(),
    findNotesByUser: jest.fn(),
    findNoteById: jest.fn(),
    createNote: jest.fn(),
    updateNote: jest.fn(),
    autoSaveNote: jest.fn(),
    findNoteVersions: jest.fn(),
    restoreVersion: jest.fn(),
  };

  const mockAiService = {
    summarize: jest.fn(),
    rewrite: jest.fn(),
    fixGrammar: jest.fn(),
    explain: jest.fn(),
    translate: jest.fn(),
    extractKeyPoints: jest.fn(),
  };

  const mockPrismaService = {
    auditLog: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotesService,
        { provide: NotesRepository, useValue: mockNotesRepo },
        { provide: AiService, useValue: mockAiService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<NotesService>(NotesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateNoteStats', () => {
    it('should correctly calculate character, word count and reading time', () => {
      const text =
        'Hello world, this is a test note for our productivity platform.';
      const stats = service.calculateNoteStats(text);
      expect(stats.characterCount).toBe(text.length);
      expect(stats.wordCount).toBe(11);
      expect(stats.readingTimeMinutes).toBe(1);
    });

    it('should handle empty strings cleanly', () => {
      const stats = service.calculateNoteStats('');
      expect(stats.characterCount).toBe(0);
      expect(stats.wordCount).toBe(0);
      expect(stats.readingTimeMinutes).toBe(0);
    });
  });
});
