import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNoteDto } from '../dto/create-note.dto';
import { UpdateNoteDto } from '../dto/update-note.dto';
import { CreateFolderDto } from '../dto/folder.dto';

@Injectable()
export class NotesRepository {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // FOLDERS
  // ==========================================

  async findFoldersByUser(userId: string) {
    return this.prisma.folder.findMany({
      where: { userId },
      include: {
        children: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async createFolder(userId: string, dto: CreateFolderDto) {
    return this.prisma.folder.create({
      data: {
        userId,
        name: dto.name,
        parentId: dto.parentId || null,
      },
    });
  }

  async deleteFolder(userId: string, folderId: string) {
    // Check ownership
    const folder = await this.prisma.folder.findFirst({
      where: { id: folderId, userId },
    });
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    return this.prisma.folder.delete({
      where: { id: folderId },
    });
  }

  // ==========================================
  // NOTES
  // ==========================================

  async findNotesByUser(
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
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      userId,
    };

    if (filters.inTrash !== undefined) {
      whereClause.inTrash = filters.inTrash;
    }
    if (filters.deleted !== undefined) {
      whereClause.deleted = filters.deleted;
    }
    if (filters.archived !== undefined) {
      whereClause.archived = filters.archived;
    }
    if (filters.folderId) {
      whereClause.folderId =
        filters.folderId === 'root' ? null : filters.folderId;
    }
    if (filters.notebookId) {
      whereClause.notebookId =
        filters.notebookId === 'unassigned' ? null : filters.notebookId;
    }
    if (filters.isPinned !== undefined) {
      whereClause.isPinned = filters.isPinned;
    }
    if (filters.isFavorite !== undefined) {
      whereClause.isFavorite = filters.isFavorite;
    }
    if (filters.favorite !== undefined) {
      whereClause.favorite = filters.favorite;
    }
    if (filters.tag) {
      whereClause.tags = {
        some: {
          tag: {
            name: filters.tag.toLowerCase(),
          },
        },
      };
    }
    if (filters.search) {
      whereClause.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { content: { contains: filters.search, mode: 'insensitive' } },
        { markdown: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const sortBy = filters.sortBy || 'updatedAt';
    const sortOrder = filters.sortOrder || 'desc';
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [notes, total] = await Promise.all([
      this.prisma.note.findMany({
        where: whereClause,
        orderBy: [{ isPinned: 'desc' }, orderBy],
        skip,
        take: limit,
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
          notebook: true,
        },
      }),
      this.prisma.note.count({ where: whereClause }),
    ]);

    return {
      notes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findNoteById(userId: string, noteId: string) {
    const note = await this.prisma.note.findFirst({
      where: {
        id: noteId,
        OR: [
          { userId },
          { collaborators: { some: { userId } } },
          { isShared: true },
          {
            id: {
              in: await this.prisma.groupResource
                .findMany({
                  where: {
                    resourceType: 'NOTE',
                    resourceId: noteId,
                    group: {
                      members: {
                        some: {
                          userId,
                        },
                      },
                    },
                  },
                  select: {
                    resourceId: true,
                  },
                })
                .then((res) => res.map((r) => r.resourceId)),
            },
          },
          {
            notebook: {
              id: {
                in: await this.prisma.groupResource
                  .findMany({
                    where: {
                      resourceType: 'NOTEBOOK',
                      group: {
                        members: {
                          some: {
                            userId,
                          },
                        },
                      },
                    },
                    select: {
                      resourceId: true,
                    },
                  })
                  .then((res) => res.map((r) => r.resourceId)),
              },
            },
          },
        ],
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            createdAt: true,
            updatedBy: {
              select: {
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!note) {
      throw new NotFoundException(
        'Note not found or you lack permission to view it',
      );
    }

    return note;
  }

  async createNote(userId: string, dto: CreateNoteDto) {
    const note = await this.prisma.note.create({
      data: {
        userId,
        title: dto.title,
        content: dto.content,
        markdown: dto.markdown || null,
        folderId: dto.folderId || null,
        notebookId: dto.notebookId || null,
        favorite: dto.favorite !== undefined ? dto.favorite : false,
        isFavorite: dto.favorite !== undefined ? dto.favorite : false,
        archived: dto.archived !== undefined ? dto.archived : false,
        deleted: dto.deleted !== undefined ? dto.deleted : false,
        inTrash: dto.deleted !== undefined ? dto.deleted : false,
        wordCount: dto.wordCount || 0,
        readingTime: dto.readingTime || 0,
        aiGenerated: dto.aiGenerated || false,
      },
    });

    if (dto.tags && dto.tags.length > 0) {
      await this.syncNoteTags(userId, note.id, dto.tags);
    }

    return this.findNoteById(userId, note.id);
  }

  async updateNote(userId: string, noteId: string, dto: UpdateNoteDto) {
    const note = await this.prisma.note.findFirst({
      where: { id: noteId, userId },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    // Capture version snapshot if content is changing
    if (dto.content !== undefined && dto.content !== note.content) {
      await this.prisma.noteVersion.create({
        data: {
          noteId,
          content: note.content,
          updatedById: userId,
        },
      });
    }

    // Auto-sync favorite <-> isFavorite
    let favoriteVal = dto.favorite;
    let isFavoriteVal = dto.isFavorite;
    if (favoriteVal !== undefined && isFavoriteVal === undefined) {
      isFavoriteVal = favoriteVal;
    } else if (isFavoriteVal !== undefined && favoriteVal === undefined) {
      favoriteVal = isFavoriteVal;
    }

    // Auto-sync deleted <-> inTrash
    let deletedVal = dto.deleted;
    let inTrashVal = dto.inTrash;
    if (deletedVal !== undefined && inTrashVal === undefined) {
      inTrashVal = deletedVal;
    } else if (inTrashVal !== undefined && deletedVal === undefined) {
      deletedVal = inTrashVal;
    }

    const updatedNote = await this.prisma.note.update({
      where: { id: noteId },
      data: {
        title: dto.title !== undefined ? dto.title : undefined,
        content: dto.content !== undefined ? dto.content : undefined,
        markdown: dto.markdown !== undefined ? dto.markdown : undefined,
        summary: dto.summary !== undefined ? dto.summary : undefined,
        folderId: dto.folderId !== undefined ? dto.folderId : undefined,
        notebookId: dto.notebookId !== undefined ? dto.notebookId : undefined,
        isPinned: dto.isPinned !== undefined ? dto.isPinned : undefined,
        isFavorite: isFavoriteVal !== undefined ? isFavoriteVal : undefined,
        favorite: favoriteVal !== undefined ? favoriteVal : undefined,
        archived: dto.archived !== undefined ? dto.archived : undefined,
        deleted: deletedVal !== undefined ? deletedVal : undefined,
        inTrash: inTrashVal !== undefined ? inTrashVal : undefined,
        wordCount: dto.wordCount !== undefined ? dto.wordCount : undefined,
        readingTime:
          dto.readingTime !== undefined ? dto.readingTime : undefined,
        aiGenerated:
          dto.aiGenerated !== undefined ? dto.aiGenerated : undefined,
      },
    });

    if (dto.tags !== undefined) {
      await this.syncNoteTags(userId, noteId, dto.tags);
    }

    return this.findNoteById(userId, updatedNote.id);
  }

  async autoSaveNote(
    userId: string,
    noteId: string,
    content: string,
    stats: { wordCount: number; readingTime: number },
  ) {
    const note = await this.prisma.note.findFirst({
      where: { id: noteId, userId },
    });
    if (!note) {
      throw new NotFoundException('Note not found');
    }

    return this.prisma.note.update({
      where: { id: noteId },
      data: {
        autoSaveContent: content,
        content: content,
        markdown: content,
        wordCount: stats.wordCount,
        readingTime: stats.readingTime,
      },
    });
  }

  async findNoteVersions(userId: string, noteId: string) {
    // Verify note access
    await this.findNoteById(userId, noteId);

    return this.prisma.noteVersion.findMany({
      where: { noteId },
      orderBy: { createdAt: 'desc' },
      include: {
        updatedBy: {
          select: {
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  }

  async restoreVersion(userId: string, noteId: string, versionId: string) {
    const note = await this.prisma.note.findFirst({
      where: { id: noteId, userId },
    });
    if (!note) {
      throw new NotFoundException('Note not found');
    }

    const version = await this.prisma.noteVersion.findFirst({
      where: { id: versionId, noteId },
    });
    if (!version) {
      throw new NotFoundException('Version history snapshot not found');
    }

    // Save current content as a version before restoring
    await this.prisma.noteVersion.create({
      data: {
        noteId,
        content: note.content,
        updatedById: userId,
      },
    });

    return this.prisma.note.update({
      where: { id: noteId },
      data: {
        content: version.content,
        autoSaveContent: null, // clear autosave cache
      },
    });
  }

  // ==========================================
  // HELPER TAG SYNC
  // ==========================================

  private async syncNoteTags(
    userId: string,
    noteId: string,
    tagNames: string[],
  ) {
    // Delete existing links
    await this.prisma.noteTag.deleteMany({
      where: { noteId },
    });

    const uniqueTagNames = [
      ...new Set(tagNames.map((name) => name.trim().toLowerCase())),
    ].filter(Boolean);

    for (const name of uniqueTagNames) {
      // Upsert global User tags
      const tag = await this.prisma.tag.upsert({
        where: {
          userId_name: {
            userId,
            name,
          },
        },
        update: {},
        create: {
          userId,
          name,
          color: 'hsl(263, 70%, 50%)', // Default accent color
        },
      });

      // Link note to tag
      await this.prisma.noteTag.create({
        data: {
          noteId,
          tagId: tag.id,
        },
      });
    }
  }
}
