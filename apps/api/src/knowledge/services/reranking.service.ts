import { Injectable, Logger } from '@nestjs/common';
import { RetrievalResult } from './retrieval.service';
import { MemoryService } from './memory.service';

@Injectable()
export class RerankingService {
  private readonly logger = new Logger(RerankingService.name);

  constructor(private memoryService: MemoryService) {}

  async rerankResults(
    userId: string,
    results: RetrievalResult[],
    minConfidenceThreshold = 0.35,
  ): Promise<RetrievalResult[]> {
    if (results.length === 0) return [];

    const memory = await this.memoryService.getOrCreateMemory(userId);
    const weakTopics = (memory.weakTopics || []).map((t: string) =>
      t.toLowerCase(),
    );

    const reranked = results
      .map((item) => {
        let rerankedScore = item.score;
        const chunkText = item.content.toLowerCase();

        let hasWeakTopicMatch = false;
        weakTopics.forEach((topic: string) => {
          if (chunkText.includes(topic)) {
            hasWeakTopicMatch = true;
          }
        });

        if (hasWeakTopicMatch) {
          rerankedScore *= 1.15;
          this.logger.log(
            `[Reranker] Boosting context chunk from file "${item.documentName}" due to weak topic overlap.`,
          );
        }

        const academicKeywords = [
          'definition',
          'theorem',
          'proof',
          'algorithm',
          'formula',
          'example',
          'contrast',
          'compare',
          'summary',
        ];
        let academicMatchCount = 0;
        academicKeywords.forEach((kw) => {
          if (chunkText.includes(kw)) academicMatchCount++;
        });

        if (academicMatchCount > 0) {
          rerankedScore *= 1.0 + Math.min(academicMatchCount * 0.02, 0.08);
        }

        return {
          ...item,
          score: Math.min(rerankedScore, 1.0),
        };
      })
      .filter((item) => item.score >= minConfidenceThreshold)
      .sort((a, b) => b.score - a.score);

    return reranked;
  }
}
