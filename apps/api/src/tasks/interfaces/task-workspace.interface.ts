export interface TaskPriorityFactor {
  urgency: number;
  importance: number;
  difficulty: number;
  examRelevance: number;
  knowledgeGap: number;
  finalScore: number;
}

export interface GeneratedTaskItem {
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  difficulty: 'HARD' | 'MEDIUM' | 'EASY';
  estimatedMinutes: number;
  tutorMode?: string;
  recommendedDocName?: string;
}

export interface DependencyCheckReport {
  hasUnmetDependencies: boolean;
  unmetPrerequisites: { id: string; title: string; status: string }[];
}

export interface WorkspaceAnalyticsSummary {
  completionRate: number;
  velocity: number;
  burnupScore: number;
  burndownScore: number;
  overdueCount: number;
  totalTasks: number;
  completedTasks: number;
}
