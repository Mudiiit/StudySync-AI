import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async globalSearch(userId: string, query: string) {
    const term = query.trim();
    if (!term) {
      return { notes: [], tasks: [] };
    }

    // Safely format search query for PostgreSQL FTS logic
    const ftsQuery = term
      .split(/\s+/)
      .map((word) => `${word}:*`)
      .join(' & ');

    try {
      // 1. Full-Text Search on Notes
      const notes = await this.prisma.$queryRaw<any[]>`
        SELECT id, title, content, "updatedAt"
        FROM "Note"
        WHERE "userId" = ${userId}
          AND "inTrash" = false
          AND (
            to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
            @@ to_tsquery('english', ${ftsQuery})
          )
        LIMIT 10;
      `;

      // 2. Full-Text Search on Tasks
      const tasks = await this.prisma.$queryRaw<any[]>`
        SELECT id, title, description, status, priority, "updatedAt"
        FROM "Task"
        WHERE "userId" = ${userId}
          AND "inTrash" = false
          AND (
            to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
            @@ to_tsquery('english', ${ftsQuery})
          )
        LIMIT 10;
      `;

      return {
        notes: notes.map((n) => ({ ...n, type: 'note' })),
        tasks: tasks.map((t) => ({ ...t, type: 'task' })),
      };
    } catch (e) {
      // Fallback to basic case-insensitive substring match if tsquery fails parsing
      const notes = await this.prisma.note.findMany({
        where: {
          userId,
          inTrash: false,
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { content: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 10,
        select: { id: true, title: true, content: true, updatedAt: true },
      });

      const tasks = await this.prisma.task.findMany({
        where: {
          userId,
          inTrash: false,
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 10,
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          updatedAt: true,
        },
      });

      return {
        notes: notes.map((n) => ({ ...n, type: 'note' })),
        tasks: tasks.map((t) => ({ ...t, type: 'task' })),
      };
    }
  }
}
