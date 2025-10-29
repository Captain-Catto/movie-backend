import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Delete,
} from "@nestjs/common";
import {
  AdminContentService,
  BlockContentDto,
  BlockTrendingDto,
} from "../services/admin-content.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";
import { Roles } from "../decorators/roles.decorator";
import { UserRole } from "../entities/user.entity";
import { ApiResponse } from "../interfaces/api.interface";
import { ContentType, MediaType } from "../entities";

@Controller("admin/content")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminContentController {
  constructor(private adminContentService: AdminContentService) {}

  @Post("block")
  @HttpCode(HttpStatus.OK)
  async blockContent(
    @Body() dto: BlockContentDto,
    @Request() req
  ): Promise<ApiResponse> {
    try {
      const result = await this.adminContentService.blockContent(
        dto,
        req.user.id
      );

      return {
        success: true,
        message: "Content blocked successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to block content",
        error: error.message,
      };
    }
  }

  @Post("unblock")
  @HttpCode(HttpStatus.OK)
  async unblockContent(
    @Body() body: { contentId: string; contentType: ContentType }
  ): Promise<ApiResponse> {
    try {
      await this.adminContentService.unblockContent(
        body.contentId,
        body.contentType
      );

      return {
        success: true,
        message: "Content unblocked successfully",
        data: null,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to unblock content",
        error: error.message,
      };
    }
  }

  @Get("list")
  @HttpCode(HttpStatus.OK)
  async getContentList(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("status") status?: "blocked" | "active" | "all",
    @Query("contentType") contentType?: ContentType,
    @Query("search") search?: string
  ): Promise<ApiResponse> {
    try {
      const result = await this.adminContentService.getContentList({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        status,
        contentType,
        search,
      });

      return {
        success: true,
        message: "Content list retrieved successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve content list",
        error: error.message,
      };
    }
  }

  @Get("trending")
  @HttpCode(HttpStatus.OK)
  async getTrendingContent(
    @Query("page") page?: number,
    @Query("limit") limit?: number
  ): Promise<ApiResponse> {
    try {
      const result = await this.adminContentService.getTrendingContent(
        page ? Number(page) : 1,
        limit ? Number(limit) : 20
      );

      return {
        success: true,
        message: "Trending content retrieved successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve trending content",
        error: error.message,
      };
    }
  }

  @Post("trending/block")
  @HttpCode(HttpStatus.OK)
  async blockTrendingContent(
    @Body() body: BlockTrendingDto
  ): Promise<ApiResponse> {
    try {
      await this.adminContentService.hideTrendingContent(body);

      return {
        success: true,
        message: "Trending content hidden successfully",
        data: null,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to hide trending content",
        error: error.message,
      };
    }
  }

  @Post("trending/unblock")
  @HttpCode(HttpStatus.OK)
  async unblockTrendingContent(
    @Body() body: { tmdbId: number; mediaType: MediaType }
  ): Promise<ApiResponse> {
    try {
      await this.adminContentService.unhideTrendingContent(
        body.tmdbId,
        body.mediaType
      );

      return {
        success: true,
        message: "Trending content unhidden successfully",
        data: null,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to unhide trending content",
        error: error.message,
      };
    }
  }

  @Get("blocked")
  @HttpCode(HttpStatus.OK)
  async getBlockedContent(
    @Query("page") page?: number,
    @Query("limit") limit?: number
  ): Promise<ApiResponse> {
    try {
      const result = await this.adminContentService.getBlockedContent(
        page ? Number(page) : 1,
        limit ? Number(limit) : 20
      );

      return {
        success: true,
        message: "Blocked content retrieved successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve blocked content",
        error: error.message,
      };
    }
  }

  @Get("stats")
  @HttpCode(HttpStatus.OK)
  async getContentStats(): Promise<ApiResponse> {
    try {
      const stats = await this.adminContentService.getContentStats();

      return {
        success: true,
        message: "Content stats retrieved successfully",
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve content stats",
        error: error.message,
      };
    }
  }
}
