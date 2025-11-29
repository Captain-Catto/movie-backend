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
import { ApiResponse } from "../interfaces/api.interface";

@Controller("comments")
export class CommentController {
  constructor(private commentService: CommentService) {}

  // ✅ GET COMMENTS FOR MOVIE/TV SHOW
  @Get("movie/:movieId")
  @HttpCode(HttpStatus.OK)
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

  // ✅ CREATE NEW COMMENT (TEMPORARY - NO AUTH FOR TESTING)
  @Post()
  // @UseGuards(JwtAuthGuard) // Commented out for testing
  @HttpCode(HttpStatus.CREATED)
  async createComment(
    @Body() dto: CreateCommentDto,
    @Request() req?
  ): Promise<ApiResponse> {
    try {
      // Use dummy user ID for testing when no auth
      const userId = req?.user?.id || 1;
      const comment = await this.commentService.createComment(dto, userId);

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

  // ✅ UPDATE COMMENT (TEMPORARY - NO AUTH FOR TESTING)
  @Put(":id")
  // @UseGuards(JwtAuthGuard) // Commented out for testing
  @HttpCode(HttpStatus.OK)
  async updateComment(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateCommentDto,
    @Request() req?
  ): Promise<ApiResponse> {
    try {
      // Use dummy user ID for testing when no auth
      const userId = req?.user?.id || 1;
      const userRole = req?.user?.role || "user";
      const comment = await this.commentService.updateComment(
        id,
        dto,
        userId,
        userRole
      );

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

  // ✅ DELETE COMMENT (TEMPORARY - NO AUTH FOR TESTING)
  @Delete(":id")
  // @UseGuards(JwtAuthGuard) // Commented out for testing
  @HttpCode(HttpStatus.OK)
  async deleteComment(
    @Param("id", ParseIntPipe) id: number,
    @Request() req?
  ): Promise<ApiResponse> {
    try {
      // Use dummy user ID for testing when no auth
      const userId = req?.user?.id || 1;
      const userRole = req?.user?.role || "user";
      const result = await this.commentService.deleteComment(
        id,
        userId,
        userRole
      );

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

  // ✅ LIKE/DISLIKE COMMENT (TEMPORARY - NO AUTH FOR TESTING)
  @Post(":id/like")
  // @UseGuards(JwtAuthGuard) // Commented out for testing
  @HttpCode(HttpStatus.OK)
  async likeComment(
    @Param("id", ParseIntPipe) id: number,
    @Body("isLike") isLike: boolean,
    @Request() req?
  ): Promise<ApiResponse> {
    try {
      // Use dummy user ID for testing when no auth
      const userId = req?.user?.id || 1;
      console.log(`🔵 [CommentController] ${isLike ? 'Like' : 'Dislike'} comment ${id} by user ${userId}`);

      const result = await this.commentService.likeComment(id, userId, isLike);
      console.log(`✅ [CommentController] Result:`, result);

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

  // ✅ REPORT COMMENT (TEMPORARY - NO AUTH FOR TESTING)
  @Post(":id/report")
  // @UseGuards(JwtAuthGuard) // Commented out for testing
  @HttpCode(HttpStatus.OK)
  async reportComment(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ReportCommentDto,
    @Request() req?
  ): Promise<ApiResponse> {
    try {
      // Use dummy user ID for testing when no auth
      const userId = req?.user?.id || 1;
      const result = await this.commentService.reportComment(id, dto, userId);

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
  @HttpCode(HttpStatus.OK)
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
  @HttpCode(HttpStatus.OK)
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
