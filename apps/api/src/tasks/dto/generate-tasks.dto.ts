import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GenerateTasksDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  sourceType?: 'SYLLABUS' | 'NOTES' | 'WEAK_TOPICS' | 'TUTOR';

  @IsOptional()
  @IsString()
  sourceText?: string;
}
