import { IsString, IsOptional, IsArray } from 'class-validator';

export class MemoryProfileDto {
  @IsString()
  @IsOptional()
  learningStyle?: string;

  @IsString()
  @IsOptional()
  preferredExplanation?: string;

  @IsArray()
  @IsOptional()
  goals?: string[];
}
