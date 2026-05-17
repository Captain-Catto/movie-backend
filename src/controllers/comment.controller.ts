import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from "@nestjs/common";
import { CommentService } from "../services/comment.service";
import {
  CreateCommentDto,
  UpdateCommentDto,
  ReportCommentDto,
  } from "../dto/comment.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";
import { Roles } from "../decorators/roles.decorator";
import { UserRole } from "../entities/user.entity";
import { ApiResponse } from "../interfaces/api.interface";
import { UnauthorizedException } from "@nestjs/common";
import { UserActivityLoggerService } from "../services/user-activity-logger.service";
import { ApiBearerAuth, ApiBody, ApiExcludeEndpoint, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  ApiIdParam,
  ApiPaginationQueries,
  ApiStandardErrors,
  ApiSuccess,
} from "../swagger/api-response.decorators";

@ApiTags('Comments')
@Controller("comments")
export class CommentController {
  constructor(
    private commentService: CommentService,
    private userActivityLogger: UserActivityLoggerService
  ) {}

  // ✅ GET COMMENTS FOR MOVIE/TV SHOW
  @Get("movie/:movieId")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "List comments for a movie", dataType: "Paginated comment list" })
  @ApiIdParam("movieId", "Movie TMDB ID")
  @ApiPaginationQueries()
  @ApiQuery({ name: "sortBy", required: false, enum: ["newest", "oldest", "popular"] })
  @ApiQuery({ name: "userId", required: false, type: Number, example: 1 })
  @ApiStandardErrors()
  async getMovieComments(
    @Param("movieId", ParseIntPipe) movieId: number,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("sortBy") sortBy?: "newest" | "oldest" | "popular",
    @Query("userId") userId?: string,
    @Request() req?: any
  ): Promise<ApiResponse> {
    try {
      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        sortBy: sortBy || "newest",
      };

      // Use userId from query param or default to 1 for testing
      const currentUserId = userId ? parseInt(userId) : req?.user?.id || 1;

      const result = await this.commentService.getCommentsByContent(
        movieId,
        undefined,
        options,
        currentUserId
      );

      return {
        success: true,
        message: "Movie comments retrieved successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve movie comments",
        error: error.message,
      };
    }
  }

  @Get("tv/:tvId")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "List comments for a TV series", dataType: "Paginated comment list" })
  @ApiIdParam("tvId", "TV series TMDB ID")
  @ApiPaginationQueries()
  @ApiQuery({ name: "sortBy", required: false, enum: ["newest", "oldest", "popular"] })
  @ApiQuery({ name: "userId", required: false, type: Number, example: 1 })
  @ApiStandardErrors()
  async getTvComments(
    @Param("tvId", ParseIntPipe) tvId: number,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("sortBy") sortBy?: "newest" | "oldest" | "popular",
    @Query("userId") userId?: string,
    @Request() req?: any
  ): Promise<ApiResponse> {
    try {
      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        sortBy: sortBy || "newest",
      };

      // Use userId from query param or default to 1 for testing
      const currentUserId = userId ? parseInt(userId) : req?.user?.id || 1;

      const result = await this.commentService.getCommentsByContent(
        undefined,
        tvId,
        options,
        currentUserId
      );

      return {
        success: true,
        message: "TV show comments retrieved successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve TV show comments",
        error: error.message,
      };
    }
  }

  // ✅ GET REPLIES FOR A COMMENT
  @Get(":id/replies")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "List replies for a comment", dataType: "Paginated reply list" })
  @ApiIdParam("id", "Parent comment ID")
  @ApiPaginationQueries()
  @ApiQuery({ name: "userId", required: false, type: Number, example: 1 })
  @ApiStandardErrors({ notFound: true })
  async getCommentReplies(
    @Param("id", ParseIntPipe) id: number,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("userId") userId?: string,
    @Request() req?: any
  ): Promise<ApiResponse> {
    try {
      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
      };

      // Use userId from query param or default to 1 for testing
      const currentUserId = userId ? parseInt(userId) : req?.user?.id || 1;

      const result = await this.commentService.getCommentReplies(
        id,
        options,
        currentUserId
      );

      return {
        success: true,
        message: "Comment replies retrieved successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve comment replies",
        error: error.message,
      };
    }
  }

  // ✅ GET SINGLE COMMENT
  @Get(":id")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Get one comment", dataType: "Comment detail" })
  @ApiIdParam("id", "Comment ID")
  @ApiStandardErrors({ notFound: true })
  async getComment(
    @Param("id", ParseIntPipe) id: number,
    @Request() req?: any
  ): Promise<ApiResponse> {
    try {
      const comment = await this.commentService.getComment(id, req?.user?.id);

      return {
        success: true,
        message: "Comment retrieved successfully",
        data: comment,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to retrieve comment",
        error: error.message,
      };
    }
  }

  // ✅ CREATE NEW COMMENT
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth("JWT")
  @ApiSuccess({ summary: "Create a comment or reply", dataType: "Created comment", status: HttpStatus.CREATED })
  @ApiStandardErrors({ unauthorized: true })
  async createComment(
    @Body() dto: CreateCommentDto,
    @Request() req?
  ): Promise<ApiResponse> {
    try {
      const userId = req?.user?.id;
      if (!userId) {
        throw new UnauthorizedException("User not authenticated");
      }
      const comment = await this.commentService.createComment(dto, userId);

      // Log comment activity
      this.userActivityLogger
        .logComment({
          userId,
          action: "CREATE",
          commentId: comment.id,
          movieId: dto.movieId || dto.tvId || 0,
          content: dto.content?.substring(0, 200),
        })
        .catch(() => {});

      return {
        success: true,
        message: "Comment created successfully",
        data: comment,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to create comment",
        error: error.message,
      };
    }
  }

  // ✅ UPDATE COMMENT
  @Put(":id")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth("JWT")
  @ApiSuccess({ summary: "Update a comment", dataType: "Updated comment" })
  @ApiIdParam("id", "Comment ID")
  @ApiStandardErrors({ unauthorized: true, notFound: true })
  async updateComment(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateCommentDto,
    @Request() req?
  ): Promise<ApiResponse> {
    try {
      const userId = req?.user?.id;
      const userRole = req?.user?.role || "user";
      if (!userId) {
        throw new UnauthorizedException("User not authenticated");
      }
      const comment = await this.commentService.updateComment(
        id,
        dto,
        userId,
        userRole
      );

      this.userActivityLogger
        .logComment({
          userId,
          action: "UPDATE",
          commentId: id,
          movieId: 0,
          content: dto.content?.substring(0, 200),
        })
        .catch(() => {});

      return {
        success: true,
        message: "Comment updated successfully",
        data: comment,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to update comment",
        error: error.message,
      };
    }
  }

  // ✅ DELETE COMMENT
  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth("JWT")
  @ApiSuccess({ summary: "Delete a comment", dataType: "null" })
  @ApiIdParam("id", "Comment ID")
  @ApiStandardErrors({ unauthorized: true, notFound: true })
  async deleteComment(
    @Param("id", ParseIntPipe) id: number,
    @Request() req?
  ): Promise<ApiResponse> {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const result = await this.commentService.deleteComment(
        id,
        userId,
        userRole
      );

      // Log comment deletion
      this.userActivityLogger
        .logComment({
          userId,
          action: "DELETE",
          commentId: id,
          movieId: 0,
        })
        .catch(() => {});

      return {
        success: true,
        message: result.message,
        data: null,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to delete comment",
        error: error.message,
      };
    }
  }

  // ✅ LIKE/DISLIKE COMMENT
  @Post(":id/like")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth("JWT")
  @ApiSuccess({ summary: "Like or dislike a comment", dataType: "Comment reaction result" })
  @ApiIdParam("id", "Comment ID")
  @ApiBody({ schema: { example: { isLike: true } } })
  @ApiStandardErrors({ unauthorized: true, notFound: true })
  async likeComment(
    @Param("id", ParseIntPipe) id: number,
    @Body("isLike") isLike: boolean,
    @Request() req?
  ): Promise<ApiResponse> {
    try {
      const userId = req?.user?.id;
      if (!userId) {
        throw new UnauthorizedException("User not authenticated");
      }
      console.log(`🔵 [CommentController] ${isLike ? 'Like' : 'Dislike'} comment ${id} by user ${userId}`);

      const result = await this.commentService.likeComment(id, userId, isLike);
      console.log(`✅ [CommentController] Result:`, result);

      this.userActivityLogger
        .logAction({
          userId,
          action: isLike ? "COMMENT_LIKE" : "COMMENT_DISLIKE",
          description: `${isLike ? "Liked" : "Disliked"} comment ${id}`,
          metadata: { commentId: id, isLike },
        })
        .catch(() => {});

      return {
        success: true,
        message: isLike
          ? "Comment liked successfully"
          : "Comment disliked successfully",
        data: result,
      };
    } catch (error) {
      console.error(`❌ [CommentController] Error:`, error);
      return {
        success: false,
        message: error.message || "Failed to like/dislike comment",
        error: error.message,
      };
    }
  }

  // ✅ REPORT COMMENT
  @Post(":id/report")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth("JWT")
  @ApiSuccess({ summary: "Report a comment", dataType: "null" })
  @ApiIdParam("id", "Comment ID")
  @ApiStandardErrors({ unauthorized: true, notFound: true })
  async reportComment(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ReportCommentDto,
    @Request() req?
  ): Promise<ApiResponse> {
    try {
      const userId = req?.user?.id;
      if (!userId) {
        throw new UnauthorizedException("User not authenticated");
      }
      const result = await this.commentService.reportComment(id, dto, userId);

      this.userActivityLogger
        .logAction({
          userId,
          action: "COMMENT_REPORT",
          description: `Reported comment ${id}`,
          metadata: { commentId: id, reason: dto.reason },
        })
        .catch(() => {});

      return {
        success: true,
        message: result.message,
        data: null,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to report comment",
        error: error.message,
      };
    }
  }

  // ✅ GET USER'S OWN COMMENTS (REQUIRES AUTH)
  @Get("user/my-comments")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth("JWT")
  @ApiSuccess({ summary: "List authenticated user's comments", dataType: "Paginated user comments" })
  @ApiPaginationQueries()
  @ApiStandardErrors({ unauthorized: true })
  async getUserComments(
    @Request() req,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ): Promise<ApiResponse> {
    try {
      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
      };

      const result = await this.commentService.getUserComments(
        req.user.id,
        options
      );

      return {
        success: true,
        message: "User comments retrieved successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve user comments",
        error: error.message,
      };
    }
  }

  // ✅ GET COMMENT STATISTICS
  @Get("stats/movie/:movieId")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Get movie comment statistics", dataType: "Comment statistics" })
  @ApiIdParam("movieId", "Movie TMDB ID")
  @ApiStandardErrors()
  async getMovieCommentStats(
    @Param("movieId", ParseIntPipe) movieId: number
  ): Promise<ApiResponse> {
    try {
      const stats = await this.commentService.getCommentStats(movieId, true);

      return {
        success: true,
        message: "Movie comment statistics retrieved successfully",
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve comment statistics",
        error: error.message,
      };
    }
  }

  @Get("stats/tv/:tvId")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Get TV comment statistics", dataType: "Comment statistics" })
  @ApiIdParam("tvId", "TV series TMDB ID")
  @ApiStandardErrors()
  async getTvCommentStats(
    @Param("tvId", ParseIntPipe) tvId: number
  ): Promise<ApiResponse> {
    try {
      const stats = await this.commentService.getCommentStats(tvId, false);

      return {
        success: true,
        message: "TV show comment statistics retrieved successfully",
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve comment statistics",
        error: error.message,
      };
    }
  }

  // ✅ CONTENT FILTER CHECK ENDPOINT
  @Post("check-content")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Check comment content against filters", dataType: "Content filter result" })
  @ApiBody({ schema: { example: { content: "Great movie!" } } })
  @ApiStandardErrors()
  async checkContent(@Body() body: { content: string }): Promise<ApiResponse> {
    try {
      // Simple content check - always allow for now
      // In production, you would integrate with ContentFilterService
      return {
        success: true,
        message: "Content check completed",
        data: { isAllowed: true },
      };
    } catch (error) {
      return {
        success: false,
        message: "Content check failed",
        error: error.message,
      };
    }
  }

  // ✅ SEARCH USERS FOR MENTIONS
  @Get("users/search")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Search users for comment mentions", dataType: "User mention list" })
  @ApiQuery({ name: "q", required: true, type: String, example: "william" })
  @ApiQuery({ name: "limit", required: false, type: Number, example: 10 })
  @ApiStandardErrors()
  async searchUsers(
    @Query("q") query: string,
    @Query("limit") limit?: string
  ): Promise<ApiResponse> {
    try {
      if (!query || query.trim().length < 2) {
        return {
          success: true,
          message: "Query too short",
          data: [],
        };
      }

      const users = await this.commentService.searchUsersForMention(
        query.trim(),
        limit ? parseInt(limit) : 10
      );

      return {
        success: true,
        message: "Users found",
        data: users,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to search users",
        error: error.message,
      };
    }
  }

  // ✅ FIX REPLY COUNTS (MAINTENANCE ENDPOINT)
  @Post("fix-reply-counts")
  @ApiExcludeEndpoint()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Recalculate comment reply counts", dataType: "Maintenance result" })
  @ApiStandardErrors()
  async fixReplyCounts(): Promise<ApiResponse> {
    try {
      const result = await this.commentService.fixReplyCounts();
      return {
        success: true,
        message: "Reply counts fixed successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to fix reply counts",
        error: error.message,
      };
    }
  }

  // ✅ FIX LIKE/DISLIKE COUNTS (MAINTENANCE ENDPOINT)
  @Post("fix-like-counts")
  @ApiExcludeEndpoint()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Recalculate comment like/dislike counts", dataType: "Maintenance result" })
  @ApiStandardErrors()
  async fixLikeCounts(): Promise<ApiResponse> {
    try {
      const result = await this.commentService.fixLikeCounts();
      return {
        success: true,
        message: "Like/dislike counts fixed successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to fix like/dislike counts",
        error: error.message,
      };
    }
  }
}
