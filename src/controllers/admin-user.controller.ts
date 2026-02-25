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
} from "@nestjs/common";
import { AdminUserService, BanUserDto } from "../services/admin-user.service";
import { UserActivityLoggerService } from "../services/user-activity-logger.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";
import { Roles } from "../decorators/roles.decorator";
import { UserRole } from "../entities/user.entity";
import { ApiResponse } from "../interfaces/api.interface";
import { UpdateUserDto } from "../dto/admin-user.dto";
import { ViewerReadOnlyInterceptor } from "../interceptors/viewer-read-only.interceptor";

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
  async updateUserRole(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { role: UserRole }
  ): Promise<ApiResponse> {
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
  async updateUser(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateUserDto
  ): Promise<ApiResponse> {
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
}
