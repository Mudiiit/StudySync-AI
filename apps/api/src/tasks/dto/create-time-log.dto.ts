import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateTimeLogDto {
  @IsString()
  @IsNotEmpty()
  taskId: string;

  @IsNumber()
  @Min(1)
  durationMins: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
