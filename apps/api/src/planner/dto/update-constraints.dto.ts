import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateConstraintsDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(16)
  maxDailyHours?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(23)
  preferredStartHour?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(24)
  preferredEndHour?: number;

  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(120)
  breakFrequencyMins?: number;

  @IsOptional()
  @IsBoolean()
  avoidLateNight?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  createdDays?: string[];
}
