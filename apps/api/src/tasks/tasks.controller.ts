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
import { GenerateTasksDto } from './dto/generate-tasks.dto';
import { CreateTimeLogDto } from './dto/create-time-log.dto';
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
  async getWorkspaces(
    @CurrentUser() user: any,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.tasksService.getWorkspaces(user.id, includeArchived === 'true');
  }

  @Post('workspaces')
  async createWorkspace(
    @CurrentUser() user: any,
    @Body() dto: CreateWorkspaceDto,
  ) {
    return this.tasksService.createWorkspace(user.id, dto);
  }

  @Patch('workspaces/:id')
  async updateWorkspace(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('name') name: string,
    @Body('description') description?: string,
  ) {
    return this.tasksService.updateWorkspace(user.id, id, name, description);
  }

  @Delete('workspaces/:id')
  async deleteWorkspace(@CurrentUser() user: any, @Param('id') id: string) {
    return this.tasksService.deleteWorkspace(user.id, id);
  }

  @Post('workspaces/:id/archive')
  async archiveWorkspace(@CurrentUser() user: any, @Param('id') id: string) {
    return this.tasksService.archiveWorkspace(user.id, id);
  }

  @Post('workspaces/:id/restore')
  async restoreWorkspace(@CurrentUser() user: any, @Param('id') id: string) {
    return this.tasksService.restoreWorkspace(user.id, id);
  }

  @Post('workspaces/:id/duplicate')
  async duplicateWorkspace(@CurrentUser() user: any, @Param('id') id: string) {
    return this.tasksService.duplicateWorkspace(user.id, id);
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
  // SPRINTS & EPICS
  // ==========================================

  @Get('sprints')
  async getSprints(
    @CurrentUser() user: any,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.tasksService.getSprints(user.id, workspaceId);
  }

  @Post('sprints')
  async createSprint(
    @CurrentUser() user: any,
    @Body('workspaceId') workspaceId: string,
    @Body('name') name: string,
    @Body('startDate') startDate: string,
    @Body('endDate') endDate: string,
    @Body('goal') goal?: string,
  ) {
    return this.tasksService.createSprint(
      user.id,
      workspaceId,
      name,
      new Date(startDate),
      new Date(endDate),
      goal,
    );
  }

  @Get('epics')
  async getEpics(
    @CurrentUser() user: any,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.tasksService.getEpics(user.id, workspaceId);
  }

  @Post('epics')
  async createEpic(
    @CurrentUser() user: any,
    @Body('workspaceId') workspaceId: string,
    @Body('name') name: string,
    @Body('description') description?: string,
    @Body('color') color?: string,
  ) {
    return this.tasksService.createEpic(
      user.id,
      workspaceId,
      name,
      description,
      color,
    );
  }

  // ==========================================
  // KANBAN COLUMNS
  // ==========================================

  @Get('kanban')
  async getKanbanColumns(
    @CurrentUser() user: any,
    @Query('workspaceId') workspaceId: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.tasksService.getKanbanColumns(user.id, workspaceId, projectId);
  }

  // ==========================================
  // DEPENDENCY CHECKS & GRAPH
  // ==========================================

  @Get('dependency-graph')
  async getDependencyGraph(
    @CurrentUser() user: any,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.tasksService.getDependencyGraph(user.id, workspaceId);
  }

  @Get(':id/dependency-check')
  async checkDependencies(@CurrentUser() user: any, @Param('id') id: string) {
    return this.tasksService.checkDependencies(user.id, id);
  }

  // ==========================================
  // AI AUTOMATION & GENERATION
  // ==========================================

  @Get('overload-check')
  async detectOverload(
    @CurrentUser() user: any,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.tasksService.detectOverload(user.id, workspaceId);
  }

  @Post(':id/estimate')
  async estimateDuration(@CurrentUser() user: any, @Param('id') id: string) {
    return this.tasksService.estimateDuration(user.id, id);
  }

  @Post('ai/generate')
  async generateTasksFromAi(
    @CurrentUser() user: any,
    @Body() dto: GenerateTasksDto,
  ) {
    return this.tasksService.generateTasksFromAi(
      user.id,
      dto.workspaceId,
      dto.projectId,
      dto.sourceType,
      dto.sourceText,
    );
  }

  // ==========================================
  // TIME LOGS
  // ==========================================

  @Post(':id/timelog')
  async addTimeLog(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: CreateTimeLogDto,
  ) {
    return this.tasksService.addTimeLog(user.id, dto);
  }

  @Get(':id/timelogs')
  async getTimeLogs(@CurrentUser() user: any, @Param('id') id: string) {
    return this.tasksService.getTimeLogs(user.id, id);
  }

  // ==========================================
  // FOCUS CONTEXT
  // ==========================================

  @Get(':id/focus-context')
  async getFocusContext(@CurrentUser() user: any, @Param('id') id: string) {
    return this.tasksService.getFocusContext(user.id, id);
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

  @Get('analytics/burnup')
  async getBurnupChart(
    @CurrentUser() user: any,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.tasksService.getBurnupChart(user.id, workspaceId);
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
