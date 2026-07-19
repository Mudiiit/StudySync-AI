import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmbeddingsService } from './embeddings.service';
import { AiEngine } from '../../ai/ai.engine';

export interface Citations {
  documentName: string;
  pageNumber: number;
  content: string;
}

@Injectable()
export class RagService {
  constructor(
    private prisma: PrismaService,
    private embeddingsService: EmbeddingsService,
    private aiEngine: AiEngine,
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

  async answerQuestion(
    userId: string,
    documentIds: string[],
    question: string,
    threshold = 0.5,
    topK = 5,
  ): Promise<{ response: string; citations: Citations[] }> {
    // 1. Validate documents
    const docs = await this.prisma.document.findMany({
      where: { id: { in: documentIds }, userId },
    });
    if (docs.length === 0) {
      throw new NotFoundException('No valid documents found');
    }

    // 2. Generate embedding for query
    const queryVector =
      await this.embeddingsService.generateEmbedding(question);

    // 3. Load all vectors for targeted documents
    const allVectors = await this.prisma.documentVector.findMany({
      where: { documentId: { in: documentIds } },
    });

    // 4. Rank by cosine similarity
    const scored = allVectors
      .map((vec) => {
        const similarity = this.cosineSimilarity(queryVector, vec.embedding);
        return { vec, similarity };
      })
      .filter((item) => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    // 5. Construct context strings and citations lists
    const contextParts: string[] = [];
    const citations: Citations[] = [];

    scored.forEach((item, idx) => {
      const docName =
        docs.find((d) => d.id === item.vec.documentId)?.name || 'Document';
      contextParts.push(
        `[Source ${idx + 1}] (File: ${docName}, Page: ${item.vec.pageNumber}):\n${item.vec.contentChunk}`,
      );
      citations.push({
        documentName: docName,
        pageNumber: item.vec.pageNumber,
        content: item.vec.contentChunk,
      });
    });

    const contextText = contextParts.join('\n\n');
    const groundedSystemInstruction =
      "You are an elite academic professor. Answer the user's question using ONLY the provided Source context. " +
      "If the context doesn't contain the answer, politely say you don't know. " +
      'Always refer to sources by their index (e.g. "[Source 1]" or "[Source 2]") to cite facts.';

    const userPrompt = `Context:\n${contextText}\n\nQuestion: ${question}`;

    // 6. Request response from AI Engine
    const response = await this.aiEngine.generate(
      userId,
      'RAG_QNA',
      userPrompt,
      groundedSystemInstruction,
    );

    return { response, citations };
  }
}
