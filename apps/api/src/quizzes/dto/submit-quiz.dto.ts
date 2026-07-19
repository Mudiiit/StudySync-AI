import { IsArray, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class QuizAnswerDto {
  @IsUUID('4')
  questionId: string;

  @IsUUID('4')
  selectedChoiceId: string;
}

export class SubmitQuizDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers: QuizAnswerDto[];
}
