import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { ChatModerationStatus } from "../entities/chat-moderation-flag.entity";

export class SendChatMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;
}

export class ResolveChatFlagDto {
  @IsIn([ChatModerationStatus.RESOLVED, ChatModerationStatus.IGNORED])
  status: ChatModerationStatus.RESOLVED | ChatModerationStatus.IGNORED;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
