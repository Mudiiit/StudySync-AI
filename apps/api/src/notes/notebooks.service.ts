import { Injectable, ConflictException } from '@nestjs/common';
import { NotebooksRepository } from './repositories/notebooks.repository';
import { CreateNotebookDto, UpdateNotebookDto } from './dto/notebook.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotebooksService {
  constructor(
    private notebooksRepo: NotebooksRepository,
    private prisma: PrismaService,
  ) {}

  async createNotebook(userId: string, dto: CreateNotebookDto) {
    const existing = await this.prisma.notebook.findFirst({
      where: {
        userId,
        title: { equals: dto.title, mode: 'insensitive' },
      },
    });
    if (existing) {
      throw new ConflictException('A notebook with that title already exists');
    }

    const notebook = await this.notebooksRepo.create(userId, dto);
    await this.logAuditAction(
      userId,
      'CREATE_NOTEBOOK',
      'Notebook',
      notebook.id,
    );
    return notebook;
  }

  async getNotebooks(userId: string) {
    return this.notebooksRepo.findManyByUser(userId);
  }

  async getNotebook(userId: string, id: string) {
    return this.notebooksRepo.findById(userId, id);
  }

  async updateNotebook(userId: string, id: string, dto: UpdateNotebookDto) {
    if (dto.title) {
      const existing = await this.prisma.notebook.findFirst({
        where: {
          userId,
          title: { equals: dto.title, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (existing) {
        throw new ConflictException(
          'A notebook with that title already exists',
        );
      }
    }

    const notebook = await this.notebooksRepo.update(userId, id, dto);
    await this.logAuditAction(userId, 'UPDATE_NOTEBOOK', 'Notebook', id, {
      fields: Object.keys(dto),
    });
    return notebook;
  }

  async deleteNotebook(userId: string, id: string) {
    const notebook = await this.notebooksRepo.delete(userId, id);
    await this.logAuditAction(userId, 'DELETE_NOTEBOOK', 'Notebook', id);
    return notebook;
  }

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
          metadata: metadata ? JSON.stringify(metadata) : undefined,
        },
      });
    } catch (e) {
      console.error('[NotebooksService] Failed to write audit log:', e);
    }
  }
}
