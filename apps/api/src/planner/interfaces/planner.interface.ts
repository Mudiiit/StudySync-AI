export interface GeneratedStudyBlock {
  subject: string;
  topic: string;
  difficulty: 'HARD' | 'MEDIUM' | 'EASY';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  durationMins: number;
  breakRecommend: string;
  requiredDocIds?: string[];
  tutorMode?: string;
  suggestedQuizId?: string;
  masteryGain?: number;
  startTime?: string;
  endTime?: string;
}

export interface GeneratedRoadmapStep {
  title: string;
  description: string;
  weekNumber: number;
  estimatedHours: number;
  topics: string[];
}

export interface CalendarConflictReport {
  hasConflict: boolean;
  conflictingEvents: any[];
  suggestedAlternativeTimes?: { startTime: string; endTime: string }[];
}

export interface ProductivitySummary {
  totalStudyMins: number;
  completedBlocks: number;
  focusScore: number;
  completionRate: number;
  learningVelocity: number;
  streakDays: number;
  examReadinessScore: number;
}
