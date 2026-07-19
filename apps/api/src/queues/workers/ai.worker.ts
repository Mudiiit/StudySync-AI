import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { FlashcardGenService } from '../../ai/services/flashcard-gen.service';
import { QuizGenService } from '../../ai/services/quiz-gen.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PdfParser } from '../../rag/providers/pdf-parser.provider';
import { DocxParser } from '../../rag/providers/docx-parser.provider';
import { ChunkingService } from '../../rag/services/chunking.service';
import { EmbeddingsService } from '../../rag/services/embeddings.service';
import * as path from 'path';
import * as fs from 'fs/promises';
import AdmZip from 'adm-zip';

@Processor('ai-queue')
export class AiWorker extends WorkerHost {
  private readonly logger = new Logger(AiWorker.name);

  constructor(
    private flashcardGen: FlashcardGenService,
    private quizGen: QuizGenService,
    private prisma: PrismaService,
    private pdfParser: PdfParser,
    private docxParser: DocxParser,
    private chunkingService: ChunkingService,
    private embeddingsService: EmbeddingsService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { userId } = job.data;

    // ==========================================
    // TASK FLASHCARD GENERATION
    // ==========================================
    if (job.name === 'generate-flashcards-job') {
      const { topic, deckId } = job.data;
      this.logger.log(
        `[BullMQ AI Worker] Generating flashcards for deck ${deckId}...`,
      );
      await job.updateProgress(10);

      const cards = await this.flashcardGen.generateFlashcards(userId, topic);
      await job.updateProgress(60);

      if (cards && cards.length > 0) {
        await this.prisma.$transaction(
          cards.map((c) =>
            this.prisma.flashcard.create({
              data: {
                userId,
                deckId,
                front: c.front,
                back: c.back,
                question: c.front,
                answer: c.back,
              },
            }),
          ),
        );
      }

      await job.updateProgress(100);
      return { success: true, count: cards.length };
    }

    // ==========================================
    // TASK QUIZ GENERATION
    // ==========================================
    if (job.name === 'generate-quiz-job') {
      const { topic, quizId } = job.data;
      this.logger.log(
        `[BullMQ AI Worker] Generating quiz questions for quiz ${quizId}...`,
      );
      await job.updateProgress(10);

      const questions = await this.quizGen.generateQuiz(userId, topic);
      await job.updateProgress(60);

      if (questions && questions.length > 0) {
        for (const q of questions) {
          await this.prisma.question.create({
            data: {
              quizId,
              question: q.questionText,
              type: q.questionType === 'TRUE_FALSE' ? 'TRUE_FALSE' : 'MCQ',
              explanation: q.explanation || '',
              order: 1,
              choices: {
                create: (q.options || []).map((o: any) => ({
                  text: o.optionText,
                  isCorrect: o.isCorrect || false,
                })),
              },
            },
          });
        }
      }

      await job.updateProgress(100);
      return { success: true, count: questions.length };
    }

    // ==========================================
    // DOCUMENT intelligence PARSING & INDEXING
    // ==========================================
    if (job.name === 'index-document-job') {
      const { documentId } = job.data;
      this.logger.log(`[BullMQ AI Worker] Indexing document ${documentId}...`);
      await job.updateProgress(5);

      const doc = await this.prisma.document.findUnique({
        where: { id: documentId },
      });
      if (!doc) {
        throw new Error('Document metadata not found in database');
      }

      // 1. Resolve file buffer (local dev)
      let buffer: Buffer;
      if (doc.fileUrl.includes('storage/files/')) {
        const fileKey = doc.fileUrl.split('storage/files/')[1];
        const localPath = path.join(process.cwd(), 'uploads', fileKey);
        buffer = await fs.readFile(localPath);
      } else {
        // Fallback or external url fetch
        throw new Error(
          'External document URL fetches not supported in this environment config.',
        );
      }
      await job.updateProgress(20);

      // 2. Parse text content
      let text = '';
      let pages: { page: number; text: string }[] = [];

      if (doc.mimeType === 'application/pdf') {
        const parsedPdf = await this.pdfParser.parse(buffer);
        text = parsedPdf.text;
        pages = parsedPdf.pages;
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
      } else if (doc.mimeType.startsWith('image/')) {
        text = `[Image document: ${doc.name}]`;
        pages = [{ page: 1, text }];
      } else {
        // Text / markdown
        text = buffer.toString('utf-8');
        pages = [{ page: 1, text }];
      }

      // Ensure all pages have at least some content so the page is registered in pgvector
      pages = pages.map((p) => {
        if (!p.text || !p.text.trim()) {
          return {
            page: p.page,
            text: `[Page ${p.page} - Image Scan or Blank Page]`,
          };
        }
        return p;
      });
      text = pages.map((p) => p.text).join('\n');

      await job.updateProgress(40);

      // 3. Chunk text content
      const chunks = this.chunkingService.chunkText(pages);
      await job.updateProgress(60);

      // 4. Generate embeddings and save to database
      this.logger.log(
        `Generating embedding vectors for ${chunks.length} chunks...`,
      );

      const insertOperations = await Promise.all(
        chunks.map(async (c, idx) => {
          const embedding = await this.embeddingsService.generateEmbedding(
            c.text,
          );
          return this.prisma.documentVector.create({
            data: {
              documentId,
              contentChunk: c.text,
              pageNumber: c.pageNumber,
              chunkIndex: idx,
              embedding,
            },
          });
        }),
      );

      await job.updateProgress(100);
      this.logger.log(
        `Successfully completed document indexing with ${insertOperations.length} vector nodes.`,
      );
      return { success: true, chunksCount: insertOperations.length };
    }
  }
}
