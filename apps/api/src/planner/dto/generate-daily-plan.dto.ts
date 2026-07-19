import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class GenerateDailyPlanDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(14)
  availableHours?: number;

  @IsOptional()
  @IsString()
  energyLevel?: 'HIGH' | 'MEDIUM' | 'LOW';

  @IsOptional()
  @IsString()
  date?: string;
}
