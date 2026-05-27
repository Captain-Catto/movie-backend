import { IsString, IsOptional, IsNumber, IsEnum } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ReportReason, BannedWordSeverity, BannedWordAction } from "../entities/comment.entity";

export class CreateCommentDto {
  @ApiProperty({ example: "Great movie!" })
  @IsString()
  content: string;

  @ApiPropertyOptional({ example: 550 })
  @IsOptional()
  @IsNumber()
  movieId?: number;

  @ApiPropertyOptional({ example: 1396 })
  @IsOptional()
  @IsNumber()
  tvId?: number;

  @ApiPropertyOptional({ example: 1, description: "Parent comment ID for replies" })
  @IsOptional()
  @IsNumber()
  parentId?: number;
}

export class UpdateCommentDto {
  @ApiProperty({ example: "Updated comment text" })
  @IsString()
  content: string;
}

export interface CommentResponseDto {
  id: number;
  content: string;
  movieId?: number;
  tvId?: number;
  parentId?: number;
  isHidden: boolean;
  hiddenReason?: string | null;
  likeCount: number;
  dislikeCount: number;
  replyCount: number;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: number;
    name: string;
    image?: string;
  };
  userLike?: boolean | null;
  canEdit?: boolean;
  canDelete?: boolean;
  isFiltered?: boolean;
  mentions?: Array<{
    id: number;
    name: string;
    image?: string | null;
  }>;
}

export class ReportCommentDto {
  @ApiProperty({ enum: ReportReason })
  @IsEnum(ReportReason)
  reason: ReportReason;

  @ApiPropertyOptional({ example: "This comment contains spam" })
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateBannedWordDto {
  @ApiProperty({ example: "spamword", description: "The word to ban" })
  @IsString()
  word: string;

  @ApiProperty({ enum: BannedWordSeverity, example: BannedWordSeverity.MEDIUM })
  @IsEnum(BannedWordSeverity)
  severity: BannedWordSeverity;

  @ApiProperty({ enum: BannedWordAction, example: BannedWordAction.FILTER })
  @IsEnum(BannedWordAction)
  action: BannedWordAction;
}
