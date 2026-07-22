import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { TasksRepository } from './repositories/tasks.repository';
import { AiEngine } from '../ai/ai.engine';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceService } from './services/workspace.service';
import { BoardService } from './services/board.service';
import { DependencyService } from './services/dependency.service';
import { AutomationService } from './services/automation.service';
import { EstimationService } from './services/estimation.service';
import { PriorityService } from './services/priority.service';
import { AnalyticsService } from './services/analytics.service';
import { getQueueToken } from '@nestjs/bullmq';

describe('TasksService', () => {
  let service: TasksService;

  const mockTasksRepo = {
    findWorkspacesByUser: jest.fn(),
    findProjectsByWorkspace: jest.fn(),
    findTasks: jest.fn(),
    findTaskById: jest.fn(),
    createTask: jest.fn(),
    updateTask: jest.fn(),
    deleteTask: jest.fn(),
    addComment: jest.fn(),
    addDependency: jest.fn(),
    removeDependency: jest.fn(),
    createChecklist: jest.fn(),
    addChecklistItem: jest.fn(),
    toggleChecklistItem: jest.fn(),
    findRecentActivity: jest.fn(),
  };

  const mockAiEngine = {
    generate: jest.fn(),
  };

  const mockPrismaService = {
    task: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
    userMemory: {
      findUnique: jest.fn(),
    },
  };

  const mockWorkspaceService = {
    getWorkspaces: jest.fn(),
    createWorkspace: jest.fn(),
    getProjects: jest.fn(),
    createProject: jest.fn(),
    getSprints: jest.fn(),
    createSprint: jest.fn(),
    getEpics: jest.fn(),
    createEpic: jest.fn(),
  };

  const mockBoardService = {
    getKanbanColumns: jest.fn(),
  };

  const mockDependencyService = {
    checkDependencies: jest.fn(),
    getDependencyGraph: jest.fn(),
  };

  const mockAutomationService = {
    autoBreakdownTask: jest.fn(),
    handleOverdueTasks: jest.fn(),
    detectOverload: jest.fn(),
  };

  const mockEstimationService = {
    estimateDuration: jest.fn(),
  };

  const mockPriorityService = {
    calculatePriorityScore: jest.fn(),
    runAiPrioritization: jest.fn(),
  };

  const mockAnalyticsService = {
    getWorkspaceAnalytics: jest.fn(),
    getBurnupChart: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: TasksRepository, useValue: mockTasksRepo },
        { provide: AiEngine, useValue: mockAiEngine },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WorkspaceService, useValue: mockWorkspaceService },
        { provide: BoardService, useValue: mockBoardService },
        { provide: DependencyService, useValue: mockDependencyService },
        { provide: AutomationService, useValue: mockAutomationService },
        { provide: EstimationService, useValue: mockEstimationService },
        { provide: PriorityService, useValue: mockPriorityService },
        { provide: AnalyticsService, useValue: mockAnalyticsService },
        { provide: getQueueToken('tasks-queue'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
