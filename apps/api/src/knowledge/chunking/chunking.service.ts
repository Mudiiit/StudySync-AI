import { Injectable } from '@nestjs/common';

export interface KnowledgeChunk {
  content: string;
  pageNumber: number;
  chunkIndex: number;
  metadata?: any;
}

@Injectable()
export class ChunkingService {
  chunkDocument(
    text: string,
    mimeType: string,
    chunkSize = 800,
    overlap = 150,
  ): KnowledgeChunk[] {
    const pages = [{ page: 1, text }];
    return this.chunkPages(pages, mimeType, chunkSize, overlap);
  }

  chunkPages(
    pages: { page: number; text: string }[],
    mimeType: string,
    chunkSize = 800,
    overlap = 150,
  ): KnowledgeChunk[] {
    const chunks: KnowledgeChunk[] = [];
    let absoluteIdx = 0;

    for (const page of pages) {
      const pageText = page.text.trim();
      if (!pageText) continue;

      let subChunks: string[] = [];

      if (
        mimeType === 'text/markdown' ||
        pageText.includes('#') ||
        pageText.includes('---')
      ) {
        subChunks = this.splitMarkdown(pageText, chunkSize, overlap);
      } else if (
        mimeType.includes('javascript') ||
        mimeType.includes('typescript') ||
        mimeType.includes('python') ||
        mimeType.includes('java') ||
        mimeType.includes('cpp') ||
        pageText.includes('function ') ||
        pageText.includes('def ') ||
        pageText.includes('class ')
      ) {
        subChunks = this.splitCode(pageText, chunkSize, overlap);
      } else {
        subChunks = this.splitRecursive(pageText, chunkSize, overlap);
      }

      subChunks.forEach((c) => {
        const headingMatch = c.match(/^(?:#|\bChapter|\bSection)\s+(.+)$/m);
        const inferredHeading = headingMatch
          ? headingMatch[1].trim()
          : undefined;

        chunks.push({
          content: c,
          pageNumber: page.page,
          chunkIndex: absoluteIdx++,
          metadata: {
            inferredHeading,
            length: c.length,
          },
        });
      });
    }

    return chunks;
  }

  private splitRecursive(
    text: string,
    size: number,
    overlap: number,
  ): string[] {
    const separators = ['\n\n', '\n', '. ', '? ', '! ', ' ', ''];

    const splitText = (txt: string, seps: string[]): string[] => {
      if (txt.length <= size) return [txt];

      const currentSep = seps[0];
      const nextSeps = seps.slice(1);

      const parts = txt.split(currentSep);
      const subResults: string[] = [];
      let currentBuffer = '';

      for (const part of parts) {
        if ((currentBuffer + currentSep + part).length > size) {
          if (currentBuffer.trim()) {
            subResults.push(currentBuffer);
          }
          if (part.length > size && nextSeps.length > 0) {
            subResults.push(...splitText(part, nextSeps));
          } else {
            currentBuffer = part;
          }
        } else {
          currentBuffer = currentBuffer
            ? currentBuffer + currentSep + part
            : part;
        }
      }

      if (currentBuffer.trim()) {
        subResults.push(currentBuffer);
      }

      return subResults;
    };

    const initial = splitText(text, separators);

    const overlapped: string[] = [];
    for (let i = 0; i < initial.length; i++) {
      let current = initial[i];
      if (i > 0 && overlap > 0) {
        const prev = initial[i - 1];
        const overlapText = prev.substring(Math.max(0, prev.length - overlap));
        current = overlapText + current;
      }
      overlapped.push(current);
    }

    return overlapped;
  }

  private splitMarkdown(text: string, size: number, overlap: number): string[] {
    const parts = text.split(/^(?=(?:#+|---)\s)/m);
    const chunks: string[] = [];
    let currentBlock = '';

    for (const part of parts) {
      if ((currentBlock + part).length > size) {
        if (currentBlock.trim()) {
          chunks.push(...this.splitRecursive(currentBlock, size, overlap));
        }
        currentBlock = part;
      } else {
        currentBlock += part;
      }
    }

    if (currentBlock.trim()) {
      chunks.push(...this.splitRecursive(currentBlock, size, overlap));
    }

    return chunks;
  }

  private splitCode(text: string, size: number, _overlap: number): string[] {
    const lines = text.split('\n');
    const chunks: string[] = [];
    let currentBlock = '';

    for (const line of lines) {
      if ((currentBlock + '\n' + line).length > size) {
        if (currentBlock.trim()) {
          chunks.push(currentBlock);
        }
        const blockLines = currentBlock.split('\n');
        currentBlock =
          blockLines.slice(Math.max(0, blockLines.length - 4)).join('\n') +
          '\n' +
          line;
      } else {
        currentBlock = currentBlock ? currentBlock + '\n' + line : line;
      }
    }

    if (currentBlock.trim()) {
      chunks.push(currentBlock);
    }

    return chunks;
  }
}
