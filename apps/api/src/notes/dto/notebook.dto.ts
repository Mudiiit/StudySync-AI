import { IsString, IsOptional, IsHexColor, MinLength } from 'class-validator';

export class CreateNotebookDto {
  @IsString()
  @MinLength(1, { message: 'Title must not be empty' })
  title: string;

  @IsHexColor({ message: 'Color must be a valid hex color code' })
  color: string;

  @IsString()
  icon: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateNotebookDto {
  @IsString()
  @IsOptional()
  @MinLength(1, { message: 'Title must not be empty' })
  title?: string;

  @IsHexColor({ message: 'Color must be a valid hex color code' })
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
