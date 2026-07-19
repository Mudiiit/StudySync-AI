import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Query,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { RagService } from './services/rag.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller('rag')
@UseGuards(JwtAuthGuard)
export class RagController {
  constructor(
    private ragService: RagService,
    private prisma: PrismaService,
    @InjectQueue('ai-queue') private aiQueue: Queue,
  ) {}

  @Post('ask')
  async askQuestion(
    @CurrentUser() user: any,
    @Body('documentIds') documentIds: string[],
    @Body('question') question: string,
  ) {
    return this.ragService.answerQuestion(user.id, documentIds, question);
  }

  @Post('index/:id')
  async triggerIndexing(
    @CurrentUser() user: any,
    @Param('id') documentId: string,
  ) {
    const job = await this.aiQueue.add('index-document-job', {
      userId: user.id,
      documentId,
    });
    return { jobId: job.id, status: 'queued' };
  }

  @Get('documents')
  async listDocuments(@CurrentUser() user: any) {
    const docs = await this.prisma.document.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { vectors: true },
        },
      },
    });

    return docs.map((doc) => ({
      id: doc.id,
      name: doc.name,
      fileUrl: doc.fileUrl,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      createdAt: doc.createdAt,
      status: doc._count.vectors > 0 ? 'indexed' : 'processing',
    }));
  }

  @Get('documents/:id')
  async getDocumentDetails(@CurrentUser() user: any, @Param('id') id: string) {
    const doc = await this.prisma.document.findFirst({
      where: {
        id,
        OR: [
          { userId: user.id },
          {
            id: {
              in: await this.prisma.groupResource
                .findMany({
                  where: {
                    resourceType: { in: ['DOCUMENT', 'FILE'] },
                    resourceId: id,
                    group: {
                      members: {
                        some: {
                          userId: user.id,
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
        vectors: {
          orderBy: [{ pageNumber: 'asc' }, { chunkIndex: 'asc' }],
          select: {
            id: true,
            pageNumber: true,
            chunkIndex: true,
            contentChunk: true,
          },
        },
      },
    });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }
    return {
      id: doc.id,
      name: doc.name,
      fileUrl: doc.fileUrl,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      createdAt: doc.createdAt,
      vectors: doc.vectors,
    };
  }

  @Patch('documents/:id')
  async updateDocument(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('name') name?: string,
    @Body('summary') summary?: string,
  ) {
    const doc = await this.prisma.document.findFirst({
      where: { id, userId: user.id },
    });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    const data: any = {};
    if (name !== undefined) {
      if (!name || !name.trim()) {
        throw new BadRequestException('Document name cannot be empty');
      }
      const duplicate = await this.prisma.document.findFirst({
        where: { name: name.trim(), userId: user.id, NOT: { id } },
      });
      if (duplicate) {
        throw new BadRequestException(
          'A document with this name already exists',
        );
      }
      data.name = name.trim();
    }

    if (summary !== undefined) {
      data.summary = summary;
    }

    return this.prisma.document.update({
      where: { id },
      data,
    });
  }
}
