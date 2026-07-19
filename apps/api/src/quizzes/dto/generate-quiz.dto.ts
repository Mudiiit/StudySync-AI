import { IsNumber, Min, Max, IsEnum } from 'class-validator';
import { Difficulty } from '@prisma/client';

export class GenerateQuizDto {
  @IsNumber()
  @Min(1)
  @Max(30)
  questionCount: number;

  @IsEnum(Difficulty)
  difficulty: Difficulty;
}
