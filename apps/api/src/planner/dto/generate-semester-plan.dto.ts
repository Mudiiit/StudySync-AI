import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class GenerateSemesterPlanDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsArray()
  @IsString({ each: true })
  subjects: string[];

  @IsNumber()
  weeksDuration: number;

  @IsOptional()
  @IsString()
  examTargetDate?: string;
}
