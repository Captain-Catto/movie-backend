import { IsString, IsOptional, IsNumber, IsEnum } from "class-validator";
import { ReportReason } from "../entities/comment.entity";

/**
 * Create Comment DTO
 * Used for creating new comments on movies or TV shows
 */
export class CreateCommentDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsNumber()
  movieId?: number;

  @IsOptional()
  @IsNumber()
  tvId?: number;

  @IsOptional()
  @IsNumber()
  parentId?: number;
}

/**
 * Update Comment DTO
 * Used for updating existing comments
 */
export class UpdateCommentDto {
  @IsString()
  content: string;
}

/**
 * Comment Response DTO
 * Structure of comment data returned to clients
 */
export interface CommentResponseDto {
  id: number;
  content: string;
  movieId?: number;
  tvId?: number;
  parentId?: number;
  isHidden: boolean;
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
  userLike?: boolean | null; // User's like status
  canEdit?: boolean;
  canDelete?: boolean;
  isFiltered?: boolean;
  mentions?: Array<{
    id: number;
    name: string;
    image?: string | null;
  }>;
}

/**
 * Report Comment DTO
 * Used for reporting inappropriate comments
 */
export class ReportCommentDto {
  @IsEnum(ReportReason)
  reason: ReportReason;

  @IsOptional()
  @IsString()
  description?: string;
}
