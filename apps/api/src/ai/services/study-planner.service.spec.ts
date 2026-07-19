import { Test, TestingModule } from '@nestjs/testing';
import { StudyPlannerService } from './study-planner.service';
import { AiEngine } from '../ai.engine';
import { PromptService } from '../prompt.service';

describe('StudyPlannerService', () => {
  let service: StudyPlannerService;

  const mockAiEngine = {
    generate: jest.fn().mockResolvedValue('Mocked Study Plan Roadmap'),
  };

  const mockPromptService = {
    getRenderedPrompt: jest.fn().mockResolvedValue('Rendered prompt text'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudyPlannerService,
        { provide: AiEngine, useValue: mockAiEngine },
        { provide: PromptService, useValue: mockPromptService },
      ],
    }).compile();

    service = module.get<StudyPlannerService>(StudyPlannerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateRoadmap', () => {
    it('should retrieve templated prompt and run engine generator', async () => {
      const plan = await service.generateRoadmap(
        'user-123',
        'Calculus',
        'Learn integration',
        'Limits',
      );
      expect(plan).toBe('Mocked Study Plan Roadmap');
      expect(mockPromptService.getRenderedPrompt).toHaveBeenCalledWith(
        'STUDY_PLANNER',
        {
          subject: 'Calculus',
          objectives: 'Learn integration',
          focus: 'Limits',
        },
      );
      expect(mockAiEngine.generate).toHaveBeenCalledWith(
        'user-123',
        'STUDY_PLANNER',
        'Rendered prompt text',
        'You are an elite academic roadmap designer.',
      );
    });
  });
});
