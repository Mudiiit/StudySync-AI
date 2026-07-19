import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { TasksRepository } from './repositories/tasks.repository';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';

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

  const mockAiService = {
    taskBreakdown: jest.fn(),
  };

  const mockPrismaService = {
    task: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: TasksRepository, useValue: mockTasksRepo },
        { provide: AiService, useValue: mockAiService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analytics', () => {
    it('should correctly sum task statistics', async () => {
      const mockTasks = [
        { id: '1', isCompleted: true, priority: 'HIGH', status: 'DONE' },
        {
          id: '2',
          isCompleted: false,
          priority: 'MEDIUM',
          status: 'IN_PROGRESS',
        },
        { id: '3', isCompleted: false, priority: 'LOW', status: 'TODO' },
      ];
      mockPrismaService.task.findMany.mockResolvedValue(mockTasks);

      const stats = await service.getAnalytics('user-1', 'ws-1');
      expect(stats.totalTasks).toBe(3);
      expect(stats.completedTasks).toBe(1);
      expect(stats.completionRate).toBe(33); // 1/3 = 33%
      expect(stats.priorityDistribution.HIGH).toBe(1);
      expect(stats.statusDistribution.TODO).toBe(1);
    });

    it('should handle zero tasks cleanly', async () => {
      mockPrismaService.task.findMany.mockResolvedValue([]);
      const stats = await service.getAnalytics('user-1', 'ws-1');
      expect(stats.totalTasks).toBe(0);
      expect(stats.completionRate).toBe(0);
    });
  });

  describe('AI Task Breakdown', () => {
    it('should query AiService and insert generated subtasks', async () => {
      const task = {
        id: 'task-123',
        title: 'Write Report',
        description: 'Draft summary',
      };
      mockTasksRepo.findTaskById.mockResolvedValue(task);
      mockAiService.taskBreakdown.mockResolvedValue(['Step 1', 'Step 2']);
      mockTasksRepo.createChecklist.mockResolvedValue({
        id: 'chk-1',
        title: 'AI Breakdown Steps',
      });
      mockTasksRepo.addChecklistItem.mockImplementation(
        (userId: string, chkId: string, title: string) => ({
          id: 'item-id',
          checklistId: chkId,
          title,
        }),
      );

      const res = await service.triggerAiBreakdown('user-1', 'task-123');
      expect(res.title).toBe('AI Breakdown Steps');
      expect(res.items.length).toBe(2);
      expect(res.items[0].title).toBe('Step 1');
      expect(mockAiService.taskBreakdown).toHaveBeenCalledWith(
        'Write Report',
        'Draft summary',
      );
    });
  });
});
