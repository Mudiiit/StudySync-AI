import {
  Injectable,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { NotesRepository } from './repositories/notes.repository';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { CreateFolderDto } from './dto/folder.dto';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotesService {
  constructor(
    private notesRepo: NotesRepository,
    private aiService: AiService,
    private prisma: PrismaService,
  ) {}

  // ==========================================
  // FOLDERS
  // ==========================================

  async getFolders(userId: string) {
    return this.notesRepo.findFoldersByUser(userId);
  }

  async createFolder(userId: string, dto: CreateFolderDto) {
    return this.notesRepo.createFolder(userId, dto);
  }

  async deleteFolder(userId: string, folderId: string) {
    return this.notesRepo.deleteFolder(userId, folderId);
  }

  // ==========================================
  // NOTES
  // ==========================================

  async getNotes(
    userId: string,
    filters: {
      folderId?: string;
      notebookId?: string;
      isPinned?: boolean;
      isFavorite?: boolean;
      favorite?: boolean;
      archived?: boolean;
      deleted?: boolean;
      inTrash?: boolean;
      tag?: string;
      search?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    return this.notesRepo.findNotesByUser(userId, filters);
  }

  async getNote(userId: string, noteId: string) {
    const note = await this.notesRepo.findNoteById(userId, noteId);
    const stats = this.calculateNoteStats(note.content);
    return { ...note, ...stats };
  }

  async createNote(userId: string, dto: CreateNoteDto) {
    const stats = this.calculateNoteStats(dto.content || '');
    const note = await this.notesRepo.createNote(userId, {
      ...dto,
      wordCount: stats.wordCount,
      readingTime: stats.readingTime,
    });
    await this.logAuditAction(userId, 'CREATE_NOTE', 'Note', note.id);
    return note;
  }

  async updateNote(userId: string, noteId: string, dto: UpdateNoteDto) {
    console.log('[NotesService] updateNote incoming title:', dto.title);
    const stats =
      dto.content !== undefined ? this.calculateNoteStats(dto.content) : null;
    const note = await this.notesRepo.updateNote(userId, noteId, {
      ...dto,
      wordCount: stats ? stats.wordCount : undefined,
      readingTime: stats ? stats.readingTime : undefined,
    });
    console.log(
      '[NotesService] updateNote saved to repository. title:',
      note?.title,
    );
    await this.logAuditAction(userId, 'UPDATE_NOTE', 'Note', noteId, {
      fields: Object.keys(dto),
    });
    return note;
  }

  async autoSave(userId: string, noteId: string, content: string) {
    const stats = this.calculateNoteStats(content);
    return this.notesRepo.autoSaveNote(userId, noteId, content, stats);
  }

  async toggleFavorite(userId: string, noteId: string) {
    const note = await this.notesRepo.findNoteById(userId, noteId);
    const newFav = !note.favorite;
    return this.updateNote(userId, noteId, {
      favorite: newFav,
      isFavorite: newFav,
    });
  }

  async toggleArchive(userId: string, noteId: string) {
    const note = await this.notesRepo.findNoteById(userId, noteId);
    const newArch = !note.archived;
    return this.updateNote(userId, noteId, { archived: newArch });
  }

  async toggleSoftDelete(userId: string, noteId: string) {
    const note = await this.notesRepo.findNoteById(userId, noteId);
    const newDel = !note.deleted;
    return this.updateNote(userId, noteId, {
      deleted: newDel,
      inTrash: newDel,
    });
  }

  async getVersions(userId: string, noteId: string) {
    return this.notesRepo.findNoteVersions(userId, noteId);
  }

  async restoreVersion(userId: string, noteId: string, versionId: string) {
    const note = await this.notesRepo.restoreVersion(userId, noteId, versionId);
    await this.logAuditAction(userId, 'RESTORE_VERSION', 'Note', noteId, {
      versionId,
    });
    return note;
  }

  // ==========================================
  // STATS GENERATOR
  // ==========================================

  calculateNoteStats(content: string) {
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const readingTime = Math.ceil(words / 200); // 200 WPM
    return {
      wordCount: words,
      readingTime: readingTime,
      readingTimeMinutes: readingTime,
      characterCount: content.length,
    };
  }

  // ==========================================
  // AI NOTE PROCESSING
  // ==========================================

  async processAiAction(
    userId: string,
    noteId: string,
    action: string,
    language?: string,
  ) {
    const note = await this.notesRepo.findNoteById(userId, noteId);
    // Use raw markdown content if available, fallback to plaintext content
    const sourceContent = note.markdown || note.content;
    let result = '';

    const studyActions = [
      'executive_summary',
      'detailed_summary',
      'exam_revision',
      'last_minute_revision',
      'key_concepts',
      'definitions',
      'learning_objectives',
      'viva_questions',
      'interview_questions',
      'practice_questions',
      'student_mistakes',
      'mnemonics',
      'explain_beginner',
      'explain_professor',
      'related_topics',
      'study_time',
      'exam_topics',
    ];

    try {
      if (studyActions.includes(action)) {
        result = await this.aiService.processStudyAction(sourceContent, action);
      } else {
        switch (action) {
          case 'summarize':
            result = await this.aiService.summarize(sourceContent);
            break;
          case 'grammar':
            result = await this.aiService.fixGrammar(sourceContent);
            break;
          case 'explain':
            result = await this.aiService.explain(sourceContent);
            break;
          case 'rewrite':
            result = await this.aiService.rewrite(sourceContent);
            break;
          case 'translate':
            if (!language)
              throw new Error('Language parameter is required for translation');
            result = await this.aiService.translate(sourceContent, language);
            break;
          case 'keypoints':
            result = await this.aiService.extractKeyPoints(sourceContent);
            break;
          case 'improve':
            result = await this.aiService.improveWriting(sourceContent);
            break;
          case 'expand':
            result = await this.aiService.expandText(sourceContent);
            break;
          case 'shorten':
            result = await this.aiService.shortenText(sourceContent);
            break;
          case 'bullets':
            result = await this.aiService.convertToBullets(sourceContent);
            break;
          case 'study_notes':
            result = await this.aiService.generateStudyNotes(sourceContent);
            break;
          case 'revision_sheet':
            result = await this.aiService.generateRevisionSheet(sourceContent);
            break;
          default:
            throw new NotFoundException(
              `AI Action '${action}' is not supported`,
            );
        }
      }
    } catch (error: any) {
      const errMsg = error.message || '';
      const status =
        error.status || error.statusCode || error.response?.status || 500;

      // Log full Google/Gemini API error only in backend console
      console.error(
        '[processAiAction] Full Gemini API Error captured on backend:',
        error,
      );

      // Handle separately and return clean friendly user messages
      if (
        status === 429 ||
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('quota') ||
        errMsg.includes('limit reached')
      ) {
        throw new HttpException(
          'AI usage limit reached. Please try again in a few minutes.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      if (
        status === 503 ||
        errMsg.includes('503') ||
        errMsg.includes('unavailable') ||
        errMsg.includes('overloaded')
      ) {
        throw new HttpException(
          'AI service is temporarily unavailable.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      if (
        status === 504 ||
        errMsg.includes('timeout') ||
        errMsg.includes('deadline exceeded') ||
        errMsg.includes('took too long') ||
        errMsg.includes('ETIMEDOUT')
      ) {
        throw new HttpException(
          'The AI request took too long. Please try again.',
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }

      if (
        status === 401 ||
        status === 403 ||
        errMsg.includes('401') ||
        errMsg.includes('403') ||
        errMsg.includes('API_KEY_INVALID') ||
        errMsg.includes('API key') ||
        errMsg.includes('unauthorized') ||
        errMsg.includes('forbidden')
      ) {
        throw new HttpException(
          'AI service configuration error.',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Default unknown AI error
      throw new HttpException(
        'Something went wrong while generating AI content.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Save summary directly to the note record if action was summarize or study helper
    if (action === 'summarize' || studyActions.includes(action)) {
      await this.prisma.note.update({
        where: { id: noteId },
        data: { summary: result },
      });
    }

    await this.logAuditAction(
      userId,
      `AI_${action.toUpperCase()}`,
      'Note',
      noteId,
    );
    return { result };
  }

  // ==========================================
  // AUDIT LOG
  // ==========================================

  private async logAuditAction(
    userId: string,
    action: string,
    entityName: string,
    entityId: string,
    metadata?: any,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          entityName,
          entityId,
          metadata: metadata || null,
        },
      });
    } catch (e) {
      // Ignored: fail-soft audit logs
    }
  }
}
