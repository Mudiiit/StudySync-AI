import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { NotebooksService } from './notebooks.service';
import { CreateNotebookDto, UpdateNotebookDto } from './dto/notebook.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('notebooks')
@UseGuards(JwtAuthGuard)
export class NotebooksController {
  constructor(private notebooksService: NotebooksService) {}

  @Post()
  async createNotebook(
    @CurrentUser() user: any,
    @Body() dto: CreateNotebookDto,
  ) {
    return this.notebooksService.createNotebook(user.id, dto);
  }

  @Get()
  async getNotebooks(@CurrentUser() user: any) {
    return this.notebooksService.getNotebooks(user.id);
  }

  @Get(':id')
  async getNotebook(@CurrentUser() user: any, @Param('id') id: string) {
    return this.notebooksService.getNotebook(user.id, id);
  }

  @Patch(':id')
  async updateNotebook(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateNotebookDto,
  ) {
    return this.notebooksService.updateNotebook(user.id, id, dto);
  }

  @Delete(':id')
  async deleteNotebook(@CurrentUser() user: any, @Param('id') id: string) {
    return this.notebooksService.deleteNotebook(user.id, id);
  }
}
