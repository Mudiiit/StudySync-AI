import { Injectable } from '@nestjs/common';

export interface Chunk {
  text: string;
  pageNumber: number;
}

@Injectable()
export class ChunkingService {
  chunkText(
    pages: { page: number; text: string }[],
    chunkSize = 800,
    overlap = 150,
  ): Chunk[] {
    const chunks: Chunk[] = [];

    for (const page of pages) {
      const text = page.text.trim();
      if (!text) continue;

      let start = 0;
      while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        const chunkText = text.substring(start, end);
        chunks.push({
          text: chunkText,
          pageNumber: page.page,
        });

        start += chunkSize - overlap;
      }
    }

    return chunks;
  }
}
