import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Query,
  Param,
  UseGuards,
  UseInterceptors,
  Request,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  BadRequestException,
} from "@nestjs/common";
import { AdminUserService, BanUserDto } from "../services/admin-user.service";
import { UserActivityLoggerService } from "../services/user-activity-logger.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";
import { Roles } from "../decorators/roles.decorator";
import { UserRole } from "../entities/user.entity";
import { ActionType, ContentType } from "../entities/view-analytics.entity";
import { ApiResponse } from "../interfaces/api.interface";
import { UpdateUserDto } from "../dto/admin-user.dto";
import { ViewerReadOnlyInterceptor } from "../interceptors/viewer-read-only.interceptor";
import { ApiBody, ApiParam, ApiQuery, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  ApiPaginationQueries,
  ApiStandardErrors,
  ApiSuccess,
} from "../swagger/api-response.decorators";

@ApiTags('Admin - Users')
@ApiBearerAuth('JWT')
@Controller("admin/users")
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ViewerReadOnlyInterceptor)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.VIEWER)
export class AdminUserController {
  constructor(
    private adminUserService: AdminUserService,
    private userActivityLogger: UserActivityLoggerService
  ) {}

  @Get("list")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "List users for admin management", dataType: "Users list" })
  @ApiStandardErrors({ unauthorized: true, forbidden: true })
  @ApiPaginationQueries()
  @ApiQuery({ name: "status", required: false, enum: ["active", "banned", "all"] })
  @ApiQuery({ name: "role", required: false, enum: UserRole })
  @ApiQuery({ name: "search", required: false, type: String, example: "user@example.com" })
  async getUsersList(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("status") status?: "active" | "banned" | "all",
    @Query("role") role?: UserRole,
    @Query("search") search?: string
  ): Promise<ApiResponse> {
    try {
      const result = await this.adminUserService.getUsersList({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        status,
        role,
        search,
      });

      return {
        success: true,
        message: "Users list retrieved successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve users list",
        error: error.message,
      };
    }
  }

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Get user details", dataType: "User detail" })
  @ApiStandardErrors({ unauthorized: true, forbidden: true, notFound: true })
  @ApiParam({ name: "id", type: Number, example: 1 })
  async getUserDetails(
    @Param("id", ParseIntPipe) id: number
  ): Promise<ApiResponse> {
    try {
      const result = await this.adminUserService.getUserDetails(id);

      return {
        success: true,
        message: "User details retrieved successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve user details",
        error: error.message,
      };
    }
  }

  @Post("ban")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Ban a user", dataType: "Updated user" })
  @ApiStandardErrors({ unauthorized: true, forbidden: true, notFound: true })
  @ApiBody({ schema: { example: { userId: 12, reason: "Abuse report confirmed" } } })
  async banUser(
    @Body() body: { userId: number; reason: string },
    @Request() req
  ): Promise<ApiResponse> {
    try {
      const dto: BanUserDto = {
        userId: body.userId,
        reason: body.reason,
        bannedBy: req.user.id,
      };

      const result = await this.adminUserService.banUser(dto);

      return {
        success: true,
        message: "User banned successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to ban user",
        error: error.message,
      };
    }
  }

  @Post("unban/:id")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Unban a user", dataType: "Updated user" })
  @ApiStandardErrors({ unauthorized: true, forbidden: true, notFound: true })
  @ApiParam({ name: "id", type: Number, example: 12 })
  async unbanUser(
    @Param("id", ParseIntPipe) id: number
  ): Promise<ApiResponse> {
    try {
      const result = await this.adminUserService.unbanUser(id);

      return {
        success: true,
        message: "User unbanned successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to unban user",
        error: error.message,
      };
    }
  }

  @Put(":id/role")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Update a user's role", dataType: "Updated user" })
  @ApiStandardErrors({ unauthorized: true, forbidden: true, notFound: true })
  @ApiParam({ name: "id", type: Number, example: 12 })
  @ApiBody({ schema: { example: { role: UserRole.ADMIN } } })
  async updateUserRole(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { role: UserRole },
    @Request() req
  ): Promise<ApiResponse> {
    if (id === Number(req.user?.id) && body.role !== req.user?.role) {
      throw new BadRequestException("You cannot change your own role");
    }

    try {
      const result = await this.adminUserService.updateUserRole(
        id,
        body.role
      );

      return {
        success: true,
        message: "User role updated successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to update user role",
        error: error.message,
      };
    }
  }

  @Put(":id")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Update a user's profile fields", dataType: "Updated user" })
  @ApiStandardErrors({ unauthorized: true, forbidden: true, notFound: true })
  @ApiParam({ name: "id", type: Number, example: 12 })
  @ApiBody({ type: UpdateUserDto })
  async updateUser(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateUserDto,
    @Request() req
  ): Promise<ApiResponse> {
    if (id === Number(req.user?.id)) {
      if (body.role && body.role !== req.user?.role) {
        throw new BadRequestException("You cannot change your own role");
      }

      if (body.isActive === false) {
        throw new BadRequestException("You cannot disable your own account");
      }
    }

    try {
      const result = await this.adminUserService.updateUserProfile(id, body);

      return {
        success: true,
        message: "User updated successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to update user",
        error: error.message,
      };
    }
  }

  @Get(":id/logs")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Get user audit logs", dataType: "User logs", isArray: true })
  @ApiStandardErrors({ unauthorized: true, forbidden: true, notFound: true })
  @ApiParam({ name: "id", type: Number, example: 12 })
  async getUserLogs(
    @Param("id", ParseIntPipe) userId: number,
    @Request() req
  ): Promise<ApiResponse> {
    try {
      const logs = await this.userActivityLogger.getUserLogs(
        userId,
        req.user.role
      );

      return {
        success: true,
        message: "User logs retrieved successfully",
        data: { logs },
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve user logs",
        error: error.message,
      };
    }
  }

  @Get("stats/overview")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Get user statistics overview", dataType: "User stats" })
  @ApiStandardErrors({ unauthorized: true, forbidden: true })
  async getUserStats(): Promise<ApiResponse> {
    try {
      const stats = await this.adminUserService.getUserStats();

      return {
        success: true,
        message: "User stats retrieved successfully",
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve user stats",
        error: error.message,
      };
    }
  }

  @Get(":id/activity")
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.VIEWER)
  @ApiSuccess({ summary: "Get user activity timeline", dataType: "User activity timeline" })
  @ApiStandardErrors({ unauthorized: true, forbidden: true, notFound: true })
  @ApiParam({ name: "id", type: Number, example: 12 })
  @ApiPaginationQueries()
  @ApiQuery({ name: "type", required: false, type: String, example: "LOGIN" })
  @ApiQuery({ name: "startDate", required: false, type: String, example: "2026-05-01" })
  @ApiQuery({ name: "endDate", required: false, type: String, example: "2026-05-16" })
  async getUserActivity(
    @Param("id", ParseIntPipe) userId: number,
    @Query("type") type?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    try {
      const result = await this.adminUserService.getUserActivityTimeline(
        userId,
        { type, startDate, endDate },
        parseInt(page || "1"),
        parseInt(limit || "20")
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to fetch user activity",
      };
    }
  }

  @Get(":id/activity-stats")
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.VIEWER)
  @ApiSuccess({ summary: "Get public user activity summary", dataType: "User activity stats" })
  @ApiStandardErrors({ unauthorized: true, forbidden: true, notFound: true })
  @ApiParam({ name: "id", type: Number, example: 12 })
  async getUserActivityStats(@Param("id", ParseIntPipe) userId: number) {
    try {
      const stats = await this.adminUserService.getPublicUserActivityStats(userId);

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to fetch user activity stats",
      };
    }
  }

  @Get(":id/watch-history")
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.VIEWER)
  @ApiSuccess({ summary: "Get user's watch history from analytics events", dataType: "Watch history" })
  @ApiStandardErrors({ unauthorized: true, forbidden: true, notFound: true })
  @ApiParam({ name: "id", type: Number, example: 12 })
  @ApiPaginationQueries()
  @ApiQuery({ name: "contentType", required: false, enum: ["movie", "tv_series", "all"] })
  @ApiQuery({ name: "actionType", required: false, enum: ["view", "play", "complete", "all"] })
  @ApiQuery({ name: "startDate", required: false, type: String, example: "2026-05-01" })
  @ApiQuery({ name: "endDate", required: false, type: String, example: "2026-05-16" })
  async getUserWatchHistory(
    @Param("id", ParseIntPipe) userId: number,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("contentType") contentType?: "movie" | "tv_series" | "all",
    @Query("actionType") actionType?: "view" | "play" | "complete" | "all",
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ) {
    try {
      const result = await this.adminUserService.getUserWatchHistory(userId, {
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        contentType: contentType as ContentType | "all" | undefined,
        actionType: actionType as ActionType | "all" | undefined,
        startDate,
        endDate,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to fetch user watch history",
      };
    }
  }

  @Get(":id/watch-time-summary")
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.VIEWER)
  @ApiSuccess({ summary: "Get user's watch time grouped by content", dataType: "Watch time summary" })
  @ApiStandardErrors({ unauthorized: true, forbidden: true, notFound: true })
  @ApiParam({ name: "id", type: Number, example: 12 })
  @ApiPaginationQueries()
  @ApiQuery({ name: "contentType", required: false, enum: ["movie", "tv_series", "all"] })
  @ApiQuery({ name: "startDate", required: false, type: String, example: "2026-05-01" })
  @ApiQuery({ name: "endDate", required: false, type: String, example: "2026-05-16" })
  async getUserWatchTimeSummary(
    @Param("id", ParseIntPipe) userId: number,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("contentType") contentType?: "movie" | "tv_series" | "all",
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ) {
    try {
      const result = await this.adminUserService.getUserWatchTimeSummary(userId, {
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        contentType: contentType as ContentType | "all" | undefined,
        startDate,
        endDate,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to fetch user watch time summary",
      };
    }
  }

  @Get(":id/search-history")
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.VIEWER)
  @ApiSuccess({ summary: "Get user's search history", dataType: "User search history" })
  @ApiStandardErrors({ unauthorized: true, forbidden: true, notFound: true })
  @ApiParam({ name: "id", type: Number, example: 12 })
  @ApiPaginationQueries()
  async getUserSearchHistory(
    @Param("id", ParseIntPipe) userId: number,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    try {
      const result = await this.adminUserService.getUserSearchHistory(userId, {
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to fetch user search history",
      };
    }
  }

  @Get(":id/favorites")
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.VIEWER)
  @ApiSuccess({ summary: "Get user's favorite content details", dataType: "User favorites" })
  @ApiStandardErrors({ unauthorized: true, forbidden: true, notFound: true })
  @ApiParam({ name: "id", type: Number, example: 12 })
  @ApiPaginationQueries()
  async getUserFavoriteDetails(
    @Param("id", ParseIntPipe) userId: number,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    try {
      const result = await this.adminUserService.getUserFavoriteDetails(userId, {
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to fetch user favorites",
      };
    }
  }

  @Get(":id/comments")
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.VIEWER)
  @ApiSuccess({ summary: "Get user's comment details", dataType: "User comments" })
  @ApiStandardErrors({ unauthorized: true, forbidden: true, notFound: true })
  @ApiParam({ name: "id", type: Number, example: 12 })
  @ApiPaginationQueries()
  async getUserCommentDetails(
    @Param("id", ParseIntPipe) userId: number,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    try {
      const result = await this.adminUserService.getUserCommentDetails(userId, {
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to fetch user comments",
      };
    }
  }
}
