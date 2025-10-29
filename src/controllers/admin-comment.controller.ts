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
import { ContentFilterService } from "../services/content-filter.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";
import { Roles } from "../decorators/roles.decorator";
import { UserRole } from "../entities/user.entity";
import { ApiResponse } from "../interfaces/api.interface";
import {
  BannedWordSeverity,
  BannedWordAction,
} from "../entities/comment.entity";

@Controller("admin/comments")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminCommentController {
  constructor(
    private commentService: CommentService,
    private contentFilterService: ContentFilterService
  ) {}

  // ✅ GET ALL COMMENTS WITH ADMIN VIEW
  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllComments(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("movieId") movieId?: string,
    @Query("tvId") tvId?: string,
    @Query("includeHidden") includeHidden?: string,
    @Query("sortBy") sortBy?: "newest" | "oldest" | "popular"
  ): Promise<ApiResponse> {
    try {
      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        sortBy: sortBy || "newest",
        includeHidden: includeHidden === "true",
      };

      let result;
      if (movieId) {
        result = await this.commentService.getCommentsByContent(
          parseInt(movieId),
          undefined,
          options
        );
      } else if (tvId) {
        result = await this.commentService.getCommentsByContent(
          undefined,
          parseInt(tvId),
          options
        );
      } else {
        // Get all comments across all content
        result = await this.commentService.getCommentsByContent(
          undefined,
          undefined,
          options
        );
      }

      return {
        success: true,
        message: "Comments retrieved successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve comments",
        error: error.message,
      };
    }
  }

  // ✅ GET REPORTED COMMENTS
  @Get("reported")
  @HttpCode(HttpStatus.OK)
  async getReportedComments(): Promise<ApiResponse> {
    try {
      const reports = await this.commentService.getReportedComments();

      return {
        success: true,
        message: "Reported comments retrieved successfully",
        data: reports,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve reported comments",
        error: error.message,
      };
    }
  }

  // ✅ HIDE COMMENT
  @Put(":id/hide")
  @HttpCode(HttpStatus.OK)
  async hideComment(
    @Param("id", ParseIntPipe) id: number,
    @Request() req,
    @Body("reason") reason?: string
  ): Promise<ApiResponse> {
    try {
      const result = await this.commentService.hideComment(
        id,
        req.user.id,
        reason
      );

      return {
        success: true,
        message: result.message,
        data: null,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to hide comment",
        error: error.message,
      };
    }
  }

  // ✅ UNHIDE COMMENT
  @Put(":id/unhide")
  @HttpCode(HttpStatus.OK)
  async unhideComment(
    @Param("id", ParseIntPipe) id: number
  ): Promise<ApiResponse> {
    try {
      const result = await this.commentService.unhideComment(id);

      return {
        success: true,
        message: result.message,
        data: null,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to unhide comment",
        error: error.message,
      };
    }
  }

  // ✅ PERMANENTLY DELETE COMMENT
  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  async deleteComment(
    @Param("id", ParseIntPipe) id: number,
    @Request() req
  ): Promise<ApiResponse> {
    try {
      const result = await this.commentService.deleteComment(
        id,
        req.user.id,
        req.user.role,
        true // Hard delete for admins
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

  // ✅ RESOLVE REPORT
  @Put("reports/:reportId/resolve")
  @HttpCode(HttpStatus.OK)
  async resolveReport(
    @Param("reportId", ParseIntPipe) reportId: number,
    @Request() req
  ): Promise<ApiResponse> {
    try {
      const result = await this.commentService.resolveReport(
        reportId,
        req.user.id
      );

      return {
        success: true,
        message: result.message,
        data: null,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to resolve report",
        error: error.message,
      };
    }
  }

  // ✅ ANALYZE COMMENT CONTENT
  @Get(":id/analyze")
  @HttpCode(HttpStatus.OK)
  async analyzeComment(
    @Param("id", ParseIntPipe) id: number
  ): Promise<ApiResponse> {
    try {
      const analysis = await this.commentService.analyzeCommentContent(id);

      return {
        success: true,
        message: "Comment analysis completed",
        data: analysis,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to analyze comment",
        error: error.message,
      };
    }
  }

  // ✅ BANNED WORDS MANAGEMENT
  @Get("banned-words")
  @HttpCode(HttpStatus.OK)
  async getBannedWords(): Promise<ApiResponse> {
    try {
      const bannedWords = await this.contentFilterService.getBannedWords();

      return {
        success: true,
        message: "Banned words retrieved successfully",
        data: bannedWords,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve banned words",
        error: error.message,
      };
    }
  }

  @Post("banned-words")
  @HttpCode(HttpStatus.CREATED)
  async addBannedWord(
    @Request() req,
    @Body("word") word: string,
    @Body("severity") severity: BannedWordSeverity,
    @Body("action") action: BannedWordAction
  ): Promise<ApiResponse> {
    try {
      if (!word || !severity || !action) {
        return {
          success: false,
          message: "Word, severity, and action are required",
          error: "Missing required fields",
        };
      }

      const bannedWord = await this.contentFilterService.addBannedWord(
        word,
        severity,
        action,
        req.user.id
      );

      return {
        success: true,
        message: "Banned word added successfully",
        data: bannedWord,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to add banned word",
        error: error.message,
      };
    }
  }

  @Delete("banned-words/:id")
  @HttpCode(HttpStatus.OK)
  async removeBannedWord(
    @Param("id", ParseIntPipe) id: number
  ): Promise<ApiResponse> {
    try {
      const success = await this.contentFilterService.removeBannedWord(id);

      if (!success) {
        return {
          success: false,
          message: "Banned word not found",
          error: "Not found",
        };
      }

      return {
        success: true,
        message: "Banned word removed successfully",
        data: null,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to remove banned word",
        error: error.message,
      };
    }
  }

  // ✅ CONTENT FILTER TESTING
  @Post("test-filter")
  @HttpCode(HttpStatus.OK)
  async testContentFilter(
    @Body("content") content: string
  ): Promise<ApiResponse> {
    try {
      if (!content) {
        return {
          success: false,
          message: "Content is required",
          error: "Missing content",
        };
      }

      const filterResult = await this.contentFilterService.filterContent(
        content
      );

      return {
        success: true,
        message: "Content filter test completed",
        data: filterResult,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to test content filter",
        error: error.message,
      };
    }
  }

  // ✅ BULK ACTIONS
  @Post("bulk/hide")
  @HttpCode(HttpStatus.OK)
  async bulkHideComments(
    @Request() req,
    @Body("commentIds") commentIds: number[],
    @Body("reason") reason?: string
  ): Promise<ApiResponse> {
    try {
      if (
        !commentIds ||
        !Array.isArray(commentIds) ||
        commentIds.length === 0
      ) {
        return {
          success: false,
          message: "Comment IDs are required",
          error: "Missing comment IDs",
        };
      }

      const results = await Promise.allSettled(
        commentIds.map((id) =>
          this.commentService.hideComment(id, req.user.id, reason)
        )
      );

      const successful = results.filter(
        (result) => result.status === "fulfilled"
      ).length;
      const failed = results.length - successful;

      return {
        success: true,
        message: `Bulk hide completed: ${successful} successful, ${failed} failed`,
        data: { successful, failed, total: results.length },
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to bulk hide comments",
        error: error.message,
      };
    }
  }

  @Post("bulk/delete")
  @HttpCode(HttpStatus.OK)
  async bulkDeleteComments(
    @Request() req,
    @Body("commentIds") commentIds: number[]
  ): Promise<ApiResponse> {
    try {
      if (
        !commentIds ||
        !Array.isArray(commentIds) ||
        commentIds.length === 0
      ) {
        return {
          success: false,
          message: "Comment IDs are required",
          error: "Missing comment IDs",
        };
      }

      const results = await Promise.allSettled(
        commentIds.map((id) =>
          this.commentService.deleteComment(
            id,
            req.user.id,
            req.user.role,
            true
          )
        )
      );

      const successful = results.filter(
        (result) => result.status === "fulfilled"
      ).length;
      const failed = results.length - successful;

      return {
        success: true,
        message: `Bulk delete completed: ${successful} successful, ${failed} failed`,
        data: { successful, failed, total: results.length },
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to bulk delete comments",
        error: error.message,
      };
    }
  }

  // ✅ COMMENT STATISTICS FOR ADMIN DASHBOARD
  @Get("stats/overview")
  @HttpCode(HttpStatus.OK)
  async getCommentOverview(): Promise<ApiResponse> {
    try {
      // This would typically aggregate data from the database
      // For now, return placeholder data
      const overview = {
        totalComments: 0,
        totalReports: 0,
        hiddenComments: 0,
        deletedComments: 0,
        topReportReasons: [],
        recentActivity: [],
      };

      return {
        success: true,
        message: "Comment overview retrieved successfully",
        data: overview,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve comment overview",
        error: error.message,
      };
    }
  }
}
