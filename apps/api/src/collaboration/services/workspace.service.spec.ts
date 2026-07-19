import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceService } from './workspace.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('WorkspaceService', () => {
  let service: WorkspaceService;

  const mockPrismaService = {
    studyGroup: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    studyGroupMember: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    groupInvitation: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<WorkspaceService>(WorkspaceService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createGroup', () => {
    it('should create group workspace and register creator as OWNER member', async () => {
      mockPrismaService.studyGroup.create.mockResolvedValue({
        id: 'group-1',
        name: 'Calc Group',
      });
      mockPrismaService.studyGroupMember.create.mockResolvedValue({
        studyGroupId: 'group-1',
        role: 'OWNER',
      });

      const res = await service.createGroup('user-1', 'Calc Group');
      expect(res.id).toBe('group-1');
      expect(mockPrismaService.studyGroup.create).toHaveBeenCalled();
    });
  });

  describe('inviteMember', () => {
    it('should allow OWNER/ADMIN to generate secure invitation tokens', async () => {
      mockPrismaService.studyGroupMember.findUnique.mockResolvedValue({
        role: 'OWNER',
      });
      mockPrismaService.groupInvitation.create.mockResolvedValue({
        token: 'securetoken123',
      });

      const res = await service.inviteMember(
        'user-1',
        'group-1',
        'friend@studysync.ai',
      );
      expect(res.token).toBe('securetoken123');
    });
  });
});
