import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseBoolPipe,
  Query as QueryDecorator,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateWorkspaceDto } from './dto/workspace.dto';
import { CreateProjectDto } from './dto/project.dto';
import {
  CreateTaskDto,
  UpdateTaskDto,
  MoveTaskDto,
  AddCommentDto,
  AddDependencyDto,
} from './dto/task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TaskStatus } from '@studysync/database';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private tasksService: TasksService) {}

  // ==========================================
  // WORKSPACES
  // ==========================================

  @Get('workspaces')
  async getWorkspaces(@CurrentUser() user: any) {
    return this.tasksService.getWorkspaces(user.id);
  }

  @Post('workspaces')
  async createWorkspace(
    @CurrentUser() user: any,
    @Body() dto: CreateWorkspaceDto,
  ) {
    return this.tasksService.createWorkspace(user.id, dto);
  }

  // ==========================================
  // PROJECTS
  // ==========================================

  @Get('projects')
  async getProjects(
    @CurrentUser() user: any,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.tasksService.getProjects(user.id, workspaceId);
  }

  @Post('projects')
  async createProject(@CurrentUser() user: any, @Body() dto: CreateProjectDto) {
    return this.tasksService.createProject(user.id, dto);
  }

  // ==========================================
  // TASKS CRUD
  // ==========================================

  @Get()
  async getTasks(
    @CurrentUser() user: any,
    @Query('workspaceId') workspaceId: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('inTrash') inTrash?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tasksService.getTasks(user.id, {
      workspaceId,
      projectId,
      status,
      priority,
      inTrash:
        inTrash === 'true' ? true : inTrash === 'false' ? false : undefined,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('activity')
  async getRecentActivity(@CurrentUser() user: any) {
    return this.tasksService.getRecentActivity(user.id);
  }

  @Get('analytics')
  async getAnalytics(
    @CurrentUser() user: any,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.tasksService.getAnalytics(user.id, workspaceId);
  }

  @Get(':id')
  async getTask(@CurrentUser() user: any, @Param('id') id: string) {
    return this.tasksService.getTask(user.id, id);
  }

  @Post()
  async createTask(@CurrentUser() user: any, @Body() dto: CreateTaskDto) {
    return this.tasksService.createTask(user.id, dto);
  }

  @Patch(':id')
  async updateTask(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.updateTask(user.id, id, dto);
  }

  @Delete(':id')
  async deleteTask(@CurrentUser() user: any, @Param('id') id: string) {
    return this.tasksService.deleteTask(user.id, id);
  }

  // ==========================================
  // MOVE TASK
  // ==========================================

  @Post(':id/move')
  async moveTask(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: MoveTaskDto,
  ) {
    return this.tasksService.moveTask(user.id, id, dto.status, dto.order);
  }

  // ==========================================
  // COMMENTS
  // ==========================================

  @Post(':id/comments')
  async addComment(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: AddCommentDto,
  ) {
    return this.tasksService.addComment(user.id, id, dto.content);
  }

  // ==========================================
  // CHECKLISTS
  // ==========================================

  @Post(':id/checklist')
  async createChecklist(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('title') title: string,
  ) {
    return this.tasksService.createChecklist(user.id, id, title);
  }

  @Post(':id/checklist/:checklistId/item')
  async addChecklistItem(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('checklistId') checklistId: string,
    @Body('title') title: string,
  ) {
    return this.tasksService.addChecklistItem(user.id, checklistId, title);
  }

  @Patch(':id/checklist-item/:itemId')
  async toggleChecklistItem(
    @CurrentUser() user: any,
    @Param('itemId') itemId: string,
    @Body('isCompleted') isCompleted: boolean,
  ) {
    return this.tasksService.toggleChecklistItem(user.id, itemId, isCompleted);
  }

  // ==========================================
  // DEPENDENCIES
  // ==========================================

  @Post(':id/dependencies')
  async addDependency(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: AddDependencyDto,
  ) {
    return this.tasksService.addDependency(user.id, id, dto.dependsOnId);
  }

  @Delete(':id/dependencies/:dependsOnId')
  async removeDependency(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('dependsOnId') dependsOnId: string,
  ) {
    return this.tasksService.removeDependency(user.id, id, dependsOnId);
  }

  // ==========================================
  // AI BREAKDOWN
  // ==========================================

  @Post(':id/ai-breakdown')
  async triggerAiBreakdown(@CurrentUser() user: any, @Param('id') id: string) {
    return this.tasksService.triggerAiBreakdown(user.id, id);
  }
}
