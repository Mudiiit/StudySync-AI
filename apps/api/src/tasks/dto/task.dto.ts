import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
  IsInt,
  IsBoolean,
} from 'class-validator';
import { TaskStatus, TaskPriority } from '@studysync/database';

export class CreateTaskDto {
  @IsUUID('4')
  workspaceId: string;

  @IsOptional()
  @IsUUID('4')
  projectId?: string | null;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsInt()
  estimatedMinutes?: number;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsInt()
  estimatedMinutes?: number;

  @IsOptional()
  @IsInt()
  actualMinutes?: number;

  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;

  @IsOptional()
  @IsBoolean()
  inTrash?: boolean;

  @IsOptional()
  @IsUUID('4')
  projectId?: string | null;

  @IsOptional()
  @IsInt()
  order?: number;
}

export class MoveTaskDto {
  @IsEnum(TaskStatus)
  status: TaskStatus;

  @IsInt()
  order: number;
}

export class AddCommentDto {
  @IsString()
  content: string;
}

export class AddDependencyDto {
  @IsUUID('4')
  dependsOnId: string;
}
