import { IsString, IsNotEmpty } from 'class-validator';

export class RenameChatDto {
  @IsString()
  @IsNotEmpty()
  title: string;
}
