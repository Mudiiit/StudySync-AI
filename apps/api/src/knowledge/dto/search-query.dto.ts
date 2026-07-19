import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsNumber,
} from 'class-validator';

export class SearchQueryDto {
  @IsString()
  @IsNotEmpty()
  query: string;

  @IsArray()
  @IsOptional()
  documentIds?: string[];

  @IsString()
  @IsOptional()
  collectionId?: string;

  @IsNumber()
  @IsOptional()
  topK?: number;
}
