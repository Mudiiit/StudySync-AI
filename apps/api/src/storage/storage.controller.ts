import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

import { XpEngineService } from '../auth/xp-engine.service';
import { Inject, forwardRef } from '@nestjs/common';

@Controller('storage')
export class StorageController {
  constructor(
    private storageService: StorageService,
    @Inject(forwardRef(() => XpEngineService))
    private xpEngine: XpEngineService,
  ) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@CurrentUser() user: any, @UploadedFile() file: any) {
    const uploaded = await this.storageService.uploadUserFile(
      user.id,
      file.originalname,
      file.buffer,
      file.mimetype,
    );
    this.xpEngine
      .grantXp(
        user.id,
        'DOCUMENT_UPLOADED',
        `Uploaded document: ${file.originalname}`,
      )
      .catch(console.error);
    return uploaded;
  }

  @Get('download/:id')
  @UseGuards(JwtAuthGuard)
  async downloadFile(@CurrentUser() user: any, @Param('id') id: string) {
    const url = await this.storageService.getSignedDownloadUrl(user.id, id);
    return { url };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteFile(@CurrentUser() user: any, @Param('id') id: string) {
    await this.storageService.deleteUserFile(user.id, id);
    return { success: true };
  }

  // ==========================================
  // FALLBACK LOCAL FILE SERVING
  // ==========================================

  @Get('files/:userId/:filename')
  serveLocalFile(
    @Param('userId') userId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const filePath = path.join(process.cwd(), 'uploads', userId, filename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Requested file not found locally');
    }
    res.sendFile(filePath);
  }
}
