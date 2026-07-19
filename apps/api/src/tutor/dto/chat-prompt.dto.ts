import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class ChatPromptDto {
  @IsUUID()
  @IsOptional()
  conversationId?: string;

  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsString()
  @IsOptional()
  mode?: string;

  @IsUUID()
  @IsOptional()
  noteId?: string;

  @IsUUID()
  @IsOptional()
  notebookId?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsOptional()
  documentIds?: string[];
}
