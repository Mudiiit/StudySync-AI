import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PdfParser } from '../../rag/providers/pdf-parser.provider';
import { DocxParser } from '../../rag/providers/docx-parser.provider';
import { ChunkingService } from '../chunking/chunking.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { TextCleaner } from '../utils/text-cleaner';
import * as path from 'path';
import * as fs from 'fs/promises';
import AdmZip from 'adm-zip';

@Processor('knowledge-queue')
export class KnowledgeIndexingWorker extends WorkerHost {
  private readonly logger = new Logger(KnowledgeIndexingWorker.name);

  constructor(
    private prisma: PrismaService,
    private pdfParser: PdfParser,
    private docxParser: DocxParser,
    private chunkingService: ChunkingService,
    private embeddingsService: EmbeddingsService,
    private textCleaner: TextCleaner,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { documentId, userId } = job.data;
    this.logger.log(
      `[BullMQ Knowledge Indexer] Processing document ${documentId} for user ${userId}...`,
    );

    try {
      await job.updateProgress(10);

      const doc = await this.prisma.document.findUnique({
        where: { id: documentId },
      });
      if (!doc) {
        throw new Error('Document metadata not found');
      }

      let buffer: Buffer;
      if (doc.fileUrl.includes('storage/files/')) {
        const fileKey = doc.fileUrl.split('storage/files/')[1];
        const localPath = path.join(process.cwd(), 'uploads', fileKey);
        buffer = await fs.readFile(localPath);
      } else {
        throw new Error('Unsupported storage URL type.');
      }
      await job.updateProgress(30);

      let text = '';
      let pages: { page: number; text: string }[] = [];

      if (doc.mimeType === 'application/pdf') {
        const parsed = await this.pdfParser.parse(buffer);
        text = parsed.text;
        pages = parsed.pages;
      } else if (
        doc.mimeType.includes('word') ||
        doc.mimeType.includes('docx')
      ) {
        text = await this.docxParser.parse(buffer);
        pages = [{ page: 1, text }];
      } else if (
        doc.mimeType.includes('presentation') ||
        doc.mimeType.includes('pptx')
      ) {
        const zip = new AdmZip(buffer);
        const slideEntries = zip
          .getEntries()
          .filter(
            (e: any) =>
              e.entryName.startsWith('ppt/slides/slide') &&
              e.entryName.endsWith('.xml'),
          );
        slideEntries.sort((a: any, b: any) => {
          const numA = parseInt(
            a.entryName.match(/slide(\d+)\.xml/)?.[1] || '0',
            10,
          );
          const numB = parseInt(
            b.entryName.match(/slide(\d+)\.xml/)?.[1] || '0',
            10,
          );
          return numA - numB;
        });
        pages = slideEntries.map((entry: any) => {
          const slideText = entry.getData().toString('utf-8');
          const textMatches = slideText.match(/<a:t>([^<]*)<\/a:t>/g) || [];
          const slideTextContent = textMatches
            .map((m: string) => m.replace(/<\/?a:t>/g, ''))
            .join(' ');
          const slideNum = parseInt(
            entry.entryName.match(/slide(\d+)\.xml/)?.[1] || '1',
            10,
          );
          return { page: slideNum, text: slideTextContent };
        });
        text = pages.map((p) => p.text).join('\n');
      } else {
        text = buffer.toString('utf-8');
        pages = [{ page: 1, text }];
      }

      await job.updateProgress(50);

      const cleaned = this.textCleaner.cleanText(text);
      const language = this.textCleaner.detectLanguage(cleaned);
      const tags = this.textCleaner.extractKeywords(cleaned, 8);

      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          tags,
          metadata: {
            language,
            wordCount: cleaned.split(/\s+/).length,
            processedAt: new Date().toISOString(),
          },
        },
      });

      const chunks = this.chunkingService.chunkPages(pages, doc.mimeType);
      await job.updateProgress(70);

      await this.prisma.documentVector.deleteMany({
        where: { documentId },
      });

      this.logger.log(
        `[BullMQ Knowledge Indexer] Generating embeddings for ${chunks.length} chunks...`,
      );

      const batchSize = 5;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (c) => {
            const embedding = await this.embeddingsService.generate(c.content);
            await this.prisma.documentVector.create({
              data: {
                documentId,
                contentChunk: c.content,
                pageNumber: c.pageNumber,
                chunkIndex: c.chunkIndex,
                embedding,
                metadata: c.metadata || {},
              },
            });
          }),
        );
        const percent = Math.min(70 + Math.ceil((i / chunks.length) * 30), 99);
        await job.updateProgress(percent);
      }

      await job.updateProgress(100);
      this.logger.log(
        `[BullMQ Knowledge Indexer] Indexing completed for document ${documentId}`,
      );
      return { success: true, chunksCount: chunks.length };
    } catch (e: any) {
      this.logger.error(
        `[BullMQ Knowledge Indexer] Failed indexing document ${documentId}: ${e.message}`,
      );
      throw e;
    }
  }
}
