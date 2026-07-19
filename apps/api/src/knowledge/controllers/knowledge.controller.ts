import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { KnowledgeService } from '../services/knowledge.service';
import { RetrievalService } from '../services/retrieval.service';
import { RerankingService } from '../services/reranking.service';
import { MemoryService } from '../services/memory.service';
import { SearchQueryDto } from '../dto/search-query.dto';
import { MemoryProfileDto } from '../dto/memory-profile.dto';
import { CreateCollectionDto } from '../dto/create-collection.dto';

@Controller('knowledge')
@UseGuards(JwtAuthGuard)
export class KnowledgeController {
  constructor(
    private knowledgeService: KnowledgeService,
    private retrievalService: RetrievalService,
    private rerankingService: RerankingService,
    private memoryService: MemoryService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @CurrentUser() user: any,
    @UploadedFile() file: any,
    @Body('collectionId') collectionId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required for upload');
    }
    return this.knowledgeService.uploadAndIndex(
      user.id,
      file.originalname,
      file.buffer,
      file.mimetype,
      collectionId,
    );
  }

  @Post('search')
  async search(@CurrentUser() user: any, @Body() body: SearchQueryDto) {
    const rawResults = await this.retrievalService.hybridSearch(
      user.id,
      body.query,
      body.documentIds,
      body.collectionId,
      body.topK || 5,
    );

    const reranked = await this.rerankingService.rerankResults(
      user.id,
      rawResults,
    );

    return {
      query: body.query,
      results: reranked.map((r) => ({
        chunkId: r.chunkId,
        documentId: r.documentId,
        documentName: r.documentName,
        content: r.content,
        pageNumber: r.pageNumber,
        score: r.score,
        metadata: r.metadata,
      })),
    };
  }

  @Get('memory')
  async getMemory(@CurrentUser() user: any) {
    return this.memoryService.getOrCreateMemory(user.id);
  }

  @Patch('memory')
  async updateMemory(@CurrentUser() user: any, @Body() body: MemoryProfileDto) {
    return this.memoryService.updateMemoryProfile(user.id, body);
  }

  @Post('collections')
  async createCollection(
    @CurrentUser() user: any,
    @Body() body: CreateCollectionDto,
  ) {
    return this.knowledgeService.createCollection(
      user.id,
      body.name,
      body.description,
    );
  }

  @Get('collections')
  async listCollections(@CurrentUser() user: any) {
    return this.knowledgeService.listCollections(user.id);
  }

  @Get('collections/:id')
  async getCollectionDetails(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.knowledgeService.getCollectionDetails(user.id, id);
  }

  @Delete('collections/:id')
  async deleteCollection(@CurrentUser() user: any, @Param('id') id: string) {
    return this.knowledgeService.deleteCollection(user.id, id);
  }

  @Delete('documents/:id')
  async deleteDocument(@CurrentUser() user: any, @Param('id') id: string) {
    return this.knowledgeService.deleteDocument(user.id, id);
  }
}
