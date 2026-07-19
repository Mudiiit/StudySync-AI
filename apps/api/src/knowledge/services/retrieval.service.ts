import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { RedisService } from '../../redis/redis.service';

export interface RetrievalResult {
  chunkId: string;
  documentId: string;
  documentName: string;
  content: string;
  pageNumber: number;
  chunkIndex: number;
  score: number;
  vectorScore?: number;
  keywordScore?: number;
  metadata?: any;
}

@Injectable()
export class RetrievalService {
  private readonly logger = new Logger(RetrievalService.name);

  constructor(
    private prisma: PrismaService,
    private embeddingsService: EmbeddingsService,
    private redisService: RedisService,
  ) {}

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    const len = Math.min(vecA.length, vecB.length);
    for (let i = 0; i < len; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private computeKeywordScore(chunkText: string, queryTerms: string[]): number {
    let score = 0;
    const cleanText = chunkText.toLowerCase();
    queryTerms.forEach((term) => {
      if (cleanText.includes(term)) {
        const matches = cleanText.split(term).length - 1;
        score += matches / (chunkText.split(/\s+/).length + 1);
      }
    });
    return score;
  }

  async hybridSearch(
    userId: string,
    query: string,
    documentIds?: string[],
    collectionId?: string,
    topK = 5,
    vectorWeight = 0.7,
    keywordWeight = 0.3,
  ): Promise<RetrievalResult[]> {
    const cacheKey = `retrieval:${userId}:${query}:${documentIds?.join(',') || 'all'}:${collectionId || 'none'}`;

    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        this.logger.log(
          `[Retrieval Cache Hit] Retrieved query context from cache`,
        );
        return JSON.parse(cached);
      }
    } catch (e: any) {
      this.logger.warn(`Failed reading retrieval cache: ${e.message}`);
    }

    let targetDocIds: string[] = [];

    if (documentIds && documentIds.length > 0) {
      targetDocIds = documentIds;
    } else if (collectionId) {
      const docsInCol = await this.prisma.document.findMany({
        where: { collectionId, userId },
        select: { id: true },
      });
      targetDocIds = docsInCol.map((d) => d.id);
    } else {
      const allDocs = await this.prisma.document.findMany({
        where: { userId },
        select: { id: true },
      });
      targetDocIds = allDocs.map((d) => d.id);
    }

    if (targetDocIds.length === 0) {
      return [];
    }

    const queryVector = await this.embeddingsService.generate(query);
    const allVectors = await this.prisma.documentVector.findMany({
      where: { documentId: { in: targetDocIds } },
      include: {
        document: {
          select: { name: true, updatedAt: true },
        },
      },
    });

    const queryTerms = query
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((t) => t.length > 2);

    const scoredResults: RetrievalResult[] = allVectors.map((vec) => {
      const vectorScore = this.cosineSimilarity(queryVector, vec.embedding);
      const keywordScore = this.computeKeywordScore(
        vec.contentChunk,
        queryTerms,
      );

      const daysElapsed =
        (Date.now() - new Date(vec.document.updatedAt).getTime()) /
        (1000 * 60 * 60 * 24);
      const recencyWeight = Math.exp(-daysElapsed / 90);

      let combinedScore =
        vectorScore * vectorWeight + keywordScore * keywordWeight;
      combinedScore = combinedScore * (0.85 + recencyWeight * 0.15);

      return {
        chunkId: vec.id,
        documentId: vec.documentId,
        documentName: vec.document.name,
        content: vec.contentChunk,
        pageNumber: vec.pageNumber,
        chunkIndex: vec.chunkIndex,
        score: combinedScore,
        vectorScore,
        keywordScore,
        metadata: vec.metadata,
      };
    });

    const sorted = scoredResults
      .filter((r) => r.score > 0.3)
      .sort((a, b) => b.score - a.score);

    const seenContents = new Set<string>();
    const uniqueResults: RetrievalResult[] = [];

    for (const item of sorted) {
      if (!seenContents.has(item.content)) {
        seenContents.add(item.content);
        uniqueResults.push(item);
      }
      if (uniqueResults.length >= topK) break;
    }

    try {
      await this.redisService.set(cacheKey, JSON.stringify(uniqueResults), 600);
    } catch (e: any) {
      this.logger.warn(`Failed writing retrieval cache: ${e.message}`);
    }

    return uniqueResults;
  }
}
