import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class GenerateRoadmapDto {
  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsOptional()
  @IsString()
  objectives?: string;

  @IsOptional()
  @IsString()
  focusArea?: string;

  @IsOptional()
  @IsNumber()
  weeksDuration?: number;
}
