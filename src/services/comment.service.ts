import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import {
  CommentRepository,
  CommentLikeRepository,
  CommentReportRepository,
  CommentMentionRepository,
  CommentQueryOptions,
  CommentWithUserLike,
} from "../repositories/comment.repository";
import {
  ContentFilterService,
  ContentFilterResult,
} from "./content-filter.service";
import {
  Comment,
  CommentLike,
  CommentReport,
  ReportReason,
  ReportStatus,
} from "../entities/comment.entity";
import { UserRole } from "../entities/user.entity";
import { NotificationService } from "./notification.service";
import { NotificationType } from "../entities/notification-template.entity";
import {
  CreateCommentDto,
  UpdateCommentDto,
  CommentResponseDto,
  ReportCommentDto,
} from "../dto/comment.dto";

@Injectable()
export class CommentService {
  private readonly logger = new Logger(CommentService.name);
  private readonly mentionPattern = /@([a-zA-Z0-9_.-]{3,40})/g;

  constructor(
    private commentRepository: CommentRepository,
    private commentLikeRepository: CommentLikeRepository,
    private commentReportRepository: CommentReportRepository,
    private commentMentionRepository: CommentMentionRepository,
    private contentFilterService: ContentFilterService,
    private notificationService: NotificationService
  ) {}

  // ✅ CORE CRUD OPERATIONS
  async createComment(
    dto: CreateCommentDto,
    userId: number
  ): Promise<CommentResponseDto> {
    let parentComment: Comment | null = null;

    // Validate content
    const lengthValidation = this.contentFilterService.validateCommentLength(
      dto.content
    );
    if (!lengthValidation.isValid) {
      throw new BadRequestException(lengthValidation.message);
    }

    // Rate limiting check
    const rateLimitCheck =
      this.contentFilterService.validateUserRateLimit(userId);
    if (!rateLimitCheck.isValid) {
      throw new BadRequestException(rateLimitCheck.message);
    }

    // Content filtering
    const filterResult = await this.contentFilterService.filterContent(
      dto.content
    );

    // Block comment if content violates policies
    if (filterResult.action === "block") {
      throw new BadRequestException(
        `Comment contains prohibited content: ${filterResult.violations.join(
          ", "
        )}`
      );
    }

    // Validate parent comment exists if this is a reply
    if (dto.parentId) {
      parentComment = await this.commentRepository.findById(dto.parentId);
      if (!parentComment) {
        throw new NotFoundException("Parent comment not found");
      }
    }

    // Validate content type (movie or TV, not both)
    if ((dto.movieId && dto.tvId) || (!dto.movieId && !dto.tvId)) {
      throw new BadRequestException(
        "Comment must be for either a movie or TV show, not both"
      );
    }

    // Create comment with filtered content
    const comment = await this.commentRepository.create({
      content: filterResult.filteredContent,
      userId,
      movieId: dto.movieId,
      tvId: dto.tvId,
      parentId: dto.parentId,
      isHidden: filterResult.action === "flag", // Auto-hide flagged content
    });

    // Increment parent comment's reply count if this is a reply
    if (dto.parentId) {
      await this.commentRepository.incrementReplyCount(dto.parentId);
    }

    // Notify parent comment owner about the new reply
    if (parentComment && parentComment.userId !== userId) {
      const replierName = comment.user?.name || "Người dùng";
      const preview =
        filterResult.filteredContent.length > 160
          ? `${filterResult.filteredContent.slice(0, 157)}...`
          : filterResult.filteredContent;

      try {
        await this.notificationService.createUserNotification(
          {
            userId: parentComment.userId,
            title: `${replierName} đã trả lời bình luận của bạn`,
            message: preview,
            type: NotificationType.INFO,
            metadata: {
              commentId: comment.id,
              parentId: parentComment.id,
              movieId: comment.movieId,
              tvId: comment.tvId,
            },
          },
          userId
        );
      } catch (error) {
        this.logger.error(
          `Failed to send reply notification to user ${parentComment.userId}`,
          error instanceof Error ? error.stack : String(error)
        );
      }
    }

    // If flagged, create an automatic report
    if (filterResult.action === "flag") {
      await this.commentReportRepository.createReport({
        commentId: comment.id,
        reporterId: userId, // System report
        reason: ReportReason.INAPPROPRIATE,
        description: `Auto-flagged for: ${filterResult.violations.join(", ")}`,
        status: ReportStatus.PENDING,
      });
    }

    // Process mentions and notify users
    await this.processCommentMentions(
      comment,
      filterResult.filteredContent,
      userId
    );

    const hydratedComment = await this.commentRepository.findById(
      comment.id,
      userId
    );

    return this.formatCommentResponse(
      hydratedComment || comment,
      userId,
      filterResult.hasViolations
    );
  }

  async getCommentsByContent(
    movieId?: number,
    tvId?: number,
    options: CommentQueryOptions = {},
    userId?: number
  ): Promise<{
    comments: CommentResponseDto[];
    total: number;
    totalPages: number;
  }> {
    const { comments, total } = await this.commentRepository.findByContent(
      movieId,
      tvId,
      { ...options, userId }
    );

    const formattedComments = comments.map((comment) =>
      this.formatCommentResponse(comment, userId)
    );

    const totalPages = Math.ceil(total / (options.limit || 20));

    return {
      comments: formattedComments,
      total,
      totalPages,
    };
  }

  async getCommentReplies(
    parentId: number,
    options: CommentQueryOptions = {},
    userId?: number
  ): Promise<{
    comments: CommentResponseDto[];
    total: number;
    totalPages: number;
  }> {
    const { comments, total } = await this.commentRepository.findReplies(
      parentId,
      { ...options, userId }
    );

    const formattedComments = comments.map((comment) =>
      this.formatCommentResponse(comment, userId)
    );

    const totalPages = Math.ceil(total / (options.limit || 10));

    return {
      comments: formattedComments,
      total,
      totalPages,
    };
  }

  async getComment(id: number, userId?: number): Promise<CommentResponseDto> {
    const comment = await this.commentRepository.findById(id, userId);
    if (!comment) {
      throw new NotFoundException("Comment not found");
    }

    return this.formatCommentResponse(comment, userId);
  }

  async updateComment(
    id: number,
    dto: UpdateCommentDto,
    userId: number,
    userRole?: UserRole
  ): Promise<CommentResponseDto> {
    const comment = await this.commentRepository.findById(id);
    if (!comment) {
      throw new NotFoundException("Comment not found");
    }

    // Check permissions
    if (
      comment.userId !== userId &&
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException("You can only edit your own comments");
    }

    // Validate content
    const lengthValidation = this.contentFilterService.validateCommentLength(
      dto.content
    );
    if (!lengthValidation.isValid) {
      throw new BadRequestException(lengthValidation.message);
    }

    // Content filtering
    const filterResult = await this.contentFilterService.filterContent(
      dto.content
    );

    if (filterResult.action === "block") {
      throw new BadRequestException(
        `Comment contains prohibited content: ${filterResult.violations.join(
          ", "
        )}`
      );
    }

    // Update comment
    const updatedComment = await this.commentRepository.updateComment(id, {
      content: filterResult.filteredContent,
      isHidden: filterResult.action === "flag",
    });

    if (updatedComment) {
      await this.processCommentMentions(
        updatedComment,
        filterResult.filteredContent,
        comment.userId
      );
    }

    const refreshedComment = await this.commentRepository.findById(
      id,
      userId
    );

    return this.formatCommentResponse(
      refreshedComment || updatedComment!,
      userId,
      filterResult.hasViolations
    );
  }

  async deleteComment(
    id: number,
    userId: number,
    userRole?: UserRole,
    hardDelete = false
  ): Promise<{ success: boolean; message: string }> {
    const comment = await this.commentRepository.findById(id);
    if (!comment) {
      throw new NotFoundException("Comment not found");
    }

    // Check permissions
    const isAdmin =
      userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;
    if (comment.userId !== userId && !isAdmin) {
      throw new ForbiddenException("You can only delete your own comments");
    }

    // Admins can hard delete, users can only soft delete
    const shouldHardDelete = hardDelete && isAdmin;
    const success = await this.commentRepository.deleteComment(
      id,
      !shouldHardDelete
    );

    if (!success) {
      throw new BadRequestException("Failed to delete comment");
    }

    // Decrement parent comment's reply count if this was a reply
    if (comment.parentId) {
      await this.commentRepository.decrementReplyCount(comment.parentId);
    }

    return {
      success: true,
      message: shouldHardDelete
        ? "Comment permanently deleted"
        : "Comment deleted",
    };
  }

  // ✅ USER INTERACTION METHODS
  async likeComment(
    commentId: number,
    userId: number,
    isLike: boolean
  ): Promise<{
    success: boolean;
    likeCount: number;
    dislikeCount: number;
    userLike: boolean;
  }> {
    this.logger.log(
      `likeComment called: commentId=${commentId}, userId=${userId}, isLike=${isLike}`
    );

    // Check if comment exists
    const comment = await this.commentRepository.findById(commentId);
    if (!comment) {
      this.logger.error(`Comment ${commentId} not found`);
      throw new NotFoundException("Comment not found");
    }
    this.logger.log(`Comment found: ${comment.id}, current likes: ${comment.likeCount}, dislikes: ${comment.dislikeCount}`);

    // Check if user already liked/disliked
    const existingLike = await this.commentLikeRepository.findUserLike(
      commentId,
      userId
    );
    this.logger.log(`Existing like: ${existingLike ? `isLike=${existingLike.isLike}` : 'none'}`);

    if (existingLike && existingLike.isLike === isLike) {
      // User is trying to like/dislike again, so remove the like/dislike
      this.logger.log(`Removing like/dislike`);
      await this.commentLikeRepository.removeLike(commentId, userId);

      // Get updated counts
      const updatedComment = await this.commentRepository.findById(commentId);
      this.logger.log(`After remove - likes: ${updatedComment!.likeCount}, dislikes: ${updatedComment!.dislikeCount}`);
      return {
        success: true,
        likeCount: updatedComment!.likeCount,
        dislikeCount: updatedComment!.dislikeCount,
        userLike: null as any,
      };
    } else {
      // Create or update like/dislike
      this.logger.log(`Creating/updating like/dislike`);
      await this.commentLikeRepository.likeComment(commentId, userId, isLike);

      // Get updated counts
      const updatedComment = await this.commentRepository.findById(commentId);
      this.logger.log(`After create/update - likes: ${updatedComment!.likeCount}, dislikes: ${updatedComment!.dislikeCount}`);
      return {
        success: true,
        likeCount: updatedComment!.likeCount,
        dislikeCount: updatedComment!.dislikeCount,
        userLike: isLike,
      };
    }
  }

  async reportComment(
    commentId: number,
    dto: ReportCommentDto,
    reporterId: number
  ): Promise<{ success: boolean; message: string }> {
    // Check if comment exists
    const comment = await this.commentRepository.findById(commentId);
    if (!comment) {
      throw new NotFoundException("Comment not found");
    }

    // Check if user already reported this comment
    const existingReports = await this.commentReportRepository.findByComment(
      commentId
    );
    const alreadyReported = existingReports.some(
      (report) => report.reporterId === reporterId
    );

    if (alreadyReported) {
      throw new BadRequestException("You have already reported this comment");
    }

    // Create report
    await this.commentReportRepository.createReport({
      commentId,
      reporterId,
      reason: dto.reason,
      description: dto.description,
      status: ReportStatus.PENDING,
    });

    return {
      success: true,
      message: "Comment reported successfully",
    };
  }

  // ✅ ADMIN MODERATION METHODS
  async hideComment(
    commentId: number,
    adminId: number,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    const comment = await this.commentRepository.findById(commentId);
    if (!comment) {
      throw new NotFoundException("Comment not found");
    }

    const success = await this.commentRepository.hideComment(
      commentId,
      adminId,
      reason
    );

    if (!success) {
      throw new BadRequestException("Failed to hide comment");
    }

    return {
      success: true,
      message: "Comment hidden successfully",
    };
  }

  async unhideComment(
    commentId: number
  ): Promise<{ success: boolean; message: string }> {
    const comment = await this.commentRepository.findById(commentId);
    if (!comment) {
      throw new NotFoundException("Comment not found");
    }

    const success = await this.commentRepository.unhideComment(commentId);

    if (!success) {
      throw new BadRequestException("Failed to unhide comment");
    }

    return {
      success: true,
      message: "Comment unhidden successfully",
    };
  }

  async getReportedComments(): Promise<CommentReport[]> {
    return await this.commentReportRepository.findPendingReports();
  }

  async resolveReport(
    reportId: number,
    adminId: number
  ): Promise<{ success: boolean; message: string }> {
    const success = await this.commentReportRepository.resolveReport(
      reportId,
      adminId
    );

    if (!success) {
      throw new NotFoundException("Report not found");
    }

    return {
      success: true,
      message: "Report resolved successfully",
    };
  }

  // ✅ STATISTICS METHODS
  async getUserComments(
    userId: number,
    options: CommentQueryOptions = {}
  ): Promise<{
    comments: CommentResponseDto[];
    total: number;
    totalPages: number;
  }> {
    const { comments, total } = await this.commentRepository.getUserComments(
      userId,
      options
    );

    const formattedComments = comments.map((comment) =>
      this.formatCommentResponse(comment, userId)
    );

    const totalPages = Math.ceil(total / (options.limit || 20));

    return {
      comments: formattedComments,
      total,
      totalPages,
    };
  }

  async getCommentStats(
    contentId: number,
    isMovie: boolean
  ): Promise<{
    totalComments: number;
    totalReplies: number;
    avgRating: number;
  }> {
    return await this.commentRepository.getCommentStats(contentId, isMovie);
  }

  // ✅ HELPER METHODS
  private formatCommentResponse(
    comment: CommentWithUserLike,
    currentUserId?: number,
    isFiltered = false
  ): CommentResponseDto {
    // Add null safety for user object
    if (!comment.user) {
      throw new Error(
        "Comment user relation not loaded. Please ensure user relation is included."
      );
    }

    return {
      id: comment.id,
      content: comment.content,
      movieId: comment.movieId,
      tvId: comment.tvId,
      parentId: comment.parentId,
      isHidden: comment.isHidden,
      likeCount: comment.likeCount,
      dislikeCount: comment.dislikeCount,
      replyCount: comment.replyCount,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      user: {
        id: comment.user.id,
        name: comment.user.name,
        image: comment.user.image,
      },
      userLike: comment.userLike,
      canEdit: currentUserId === comment.userId,
      canDelete: currentUserId === comment.userId,
      isFiltered,
      mentions:
        comment.mentions?.map((mention) => ({
          id:
            mention.mentionedUser?.id ?? mention.mentionedUserId ?? undefined,
          name: mention.mentionedUser?.name ?? "",
          image: mention.mentionedUser?.image ?? null,
        })) || [],
    };
  }

  // Content analysis for admin insights
  async analyzeCommentContent(commentId: number): Promise<{
    wordCount: number;
    characterCount: number;
    sentiment: "positive" | "negative" | "neutral";
    readabilityScore: number;
    violations: string[];
  }> {
    const comment = await this.commentRepository.findById(commentId);
    if (!comment) {
      throw new NotFoundException("Comment not found");
    }

    const analysis = this.contentFilterService.analyzeContent(comment.content);
    const filterResult = await this.contentFilterService.filterContent(
      comment.content
    );

    return {
      ...analysis,
      violations: filterResult.violations,
    };
  }

  private extractMentionUsernames(content: string): string[] {
    if (!content) {
      return [];
    }

    const regex = new RegExp(this.mentionPattern.source, "g");
    const usernames = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      const username = match[1]?.trim();
      if (username) {
        usernames.add(username);
      }
    }

    return Array.from(usernames).slice(0, 10);
  }

  private async processCommentMentions(
    comment: Comment,
    content: string,
    authorId: number
  ): Promise<void> {
    if (!comment?.id) {
      return;
    }

    const mentionedUsernames = this.extractMentionUsernames(content);
    const existingMentions = await this.commentMentionRepository.findByComment(
      comment.id
    );
    const existingMentionIds = new Set(
      existingMentions.map((mention) => mention.mentionedUserId)
    );

    if (!mentionedUsernames.length) {
      if (existingMentions.length) {
        await this.commentMentionRepository.replaceMentions(comment.id, []);
      }
      return;
    }

    const matchedUsers = await this.commentRepository.findUsersByNames(
      mentionedUsernames
    );

    const filteredUsers = matchedUsers.filter(
      (user) => user.id !== authorId && user.isActive !== false
    );
    const uniqueUserIds = Array.from(
      new Set(filteredUsers.map((user) => user.id))
    );

    await this.commentMentionRepository.replaceMentions(
      comment.id,
      uniqueUserIds
    );

    const newMentionedUsers = filteredUsers.filter(
      (user) => !existingMentionIds.has(user.id)
    );

    if (!newMentionedUsers.length) {
      return;
    }

    const authorName = comment.user?.name || "Người dùng";
    const preview =
      content.length > 160 ? `${content.slice(0, 157)}...` : content;

    await Promise.all(
      newMentionedUsers.map(async (user) => {
        try {
          await this.notificationService.createUserNotification(
            {
              userId: user.id,
              title: `${authorName} đã nhắc bạn trong một bình luận`,
              message: preview,
              type: NotificationType.INFO,
            },
            authorId
          );
        } catch (error) {
          this.logger.error(
            `Failed to send mention notification to user ${user.id}`,
            error instanceof Error ? error.stack : String(error)
          );
        }
      })
    );
  }

  async searchUsersForMention(
    query: string,
    limit: number = 10
  ): Promise<Array<{ id: number; name: string; image?: string }>> {
    const users = await this.commentRepository.findUsersByNames([query]);

    // If exact match not found, search by prefix
    if (!users.length) {
      const allUsers = await this.commentRepository.findUsersByNamePrefix(
        query,
        limit
      );
      return allUsers
        .filter((user) => user.isActive !== false)
        .map((user) => ({
          id: user.id,
          name: user.name,
          image: user.image,
        }));
    }

    return users
      .filter((user) => user.isActive !== false)
      .slice(0, limit)
      .map((user) => ({
        id: user.id,
        name: user.name,
        image: user.image,
      }));
  }

  async fixReplyCounts(): Promise<{ fixed: number; total: number }> {
    const result = await this.commentRepository.fixReplyCounts();
    return result;
  }

  async fixLikeCounts(): Promise<{ fixed: number; total: number }> {
    const result = await this.commentRepository.fixLikeCounts();
    return result;
  }
}
