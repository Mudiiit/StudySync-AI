import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotebookDto, UpdateNotebookDto } from '../dto/notebook.dto';

@Injectable()
export class NotebooksRepository {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateNotebookDto) {
    return this.prisma.notebook.create({
      data: {
        userId,
        title: dto.title,
        color: dto.color,
        icon: dto.icon,
        description: dto.description || null,
      },
    });
  }

  async findManyByUser(userId: string) {
    return this.prisma.notebook.findMany({
      where: { userId },
      include: {
        _count: {
          select: { notes: { where: { deleted: false } } },
        },
      },
      orderBy: { title: 'asc' },
    });
  }

  async findById(userId: string, id: string) {
    const notebook = await this.prisma.notebook.findFirst({
      where: {
        id,
        OR: [
          { userId },
          {
            id: {
              in: await this.prisma.groupResource
                .findMany({
                  where: {
                    resourceType: 'NOTEBOOK',
                    resourceId: id,
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
        ],
      },
      include: {
        notes: {
          where: { deleted: false },
          orderBy: { createdAt: 'desc' },
          include: {
            tags: {
              include: { tag: true },
            },
          },
        },
        _count: {
          select: { notes: { where: { deleted: false } } },
        },
      },
    });
    if (!notebook) {
      throw new NotFoundException('Notebook not found');
    }
    return notebook;
  }

  async update(userId: string, id: string, dto: UpdateNotebookDto) {
    // Check ownership
    await this.findById(userId, id);

    return this.prisma.notebook.update({
      where: { id },
      data: {
        title: dto.title,
        color: dto.color,
        icon: dto.icon,
        description: dto.description,
      },
    });
  }

  async delete(userId: string, id: string) {
    // Check ownership
    await this.findById(userId, id);

    // We cascade soft-delete notes inside this notebook, or set their notebookId to null.
    // Based on onDelete: SetNull in Prisma schema, the DB sets note.notebookId = null automatically.
    // However, we want to make sure the user knows it's deleted.
    return this.prisma.notebook.delete({
      where: { id },
    });
  }
}
