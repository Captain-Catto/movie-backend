import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ChatModerationStatus } from "../entities/chat-moderation-flag.entity";

export class SendChatMessageDto {
  @ApiProperty({
    example: "Gợi ý cho tôi phim hành động giống các phim tôi đã thích",
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;

  @ApiPropertyOptional({ example: "vi-VN", maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;
}

export class ResolveChatFlagDto {
  @ApiProperty({
    enum: [ChatModerationStatus.RESOLVED, ChatModerationStatus.IGNORED],
    example: ChatModerationStatus.RESOLVED,
  })
  @IsIn([ChatModerationStatus.RESOLVED, ChatModerationStatus.IGNORED])
  status: ChatModerationStatus.RESOLVED | ChatModerationStatus.IGNORED;

  @ApiPropertyOptional({ example: "Reviewed and no further action needed", maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
