import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  Request,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from "@nestjs/common";
import { NotificationService } from "../services/notification.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";
import { Roles } from "../decorators/roles.decorator";
import { UserRole } from "../entities/user.entity";
import { ApiResponse } from "../interfaces/api.interface";
import { ViewerReadOnlyInterceptor } from "../interceptors/viewer-read-only.interceptor";
import {
  CreateBroadcastNotificationDto,
  CreateRoleNotificationDto,
  CreateUserNotificationDto,
} from "../dto/notification.dto";
import {
  NotificationTargetType,
  NotificationType,
} from "../entities/notification-template.entity";
import { ApiBody, ApiQuery, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  ApiIdParam,
  ApiPaginationQueries,
  ApiStandardErrors,
  ApiSuccess,
} from "../swagger/api-response.decorators";

@ApiTags('Admin - Notifications')
@ApiBearerAuth('JWT')
@Controller("admin/notifications")
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ViewerReadOnlyInterceptor)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.VIEWER)
export class AdminNotificationController {
  constructor(private notificationService: NotificationService) {}

  @Post("broadcast")
  @HttpCode(HttpStatus.CREATED)
  @ApiSuccess({ summary: "Send broadcast notification to all users", dataType: "Notification campaign result", status: HttpStatus.CREATED })
  @ApiBody({ type: CreateBroadcastNotificationDto })
  @ApiStandardErrors({ unauthorized: true, forbidden: true })
  async createBroadcastNotification(
    @Body() dto: CreateBroadcastNotificationDto,
    @Request() req
  ): Promise<ApiResponse> {
    try {
      const result = await this.notificationService.createBroadcastNotification(
        dto,
        req.user.id
      );

      return {
        success: true,
        message: "Broadcast notification sent successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to send broadcast notification",
        error: error.message,
      };
    }
  }

  @Post("role")
  @HttpCode(HttpStatus.CREATED)
  @ApiSuccess({ summary: "Send notification to users by role", dataType: "Notification campaign result", status: HttpStatus.CREATED })
  @ApiBody({ type: CreateRoleNotificationDto })
  @ApiStandardErrors({ unauthorized: true, forbidden: true })
  async createRoleNotification(
    @Body() dto: CreateRoleNotificationDto,
    @Request() req
  ): Promise<ApiResponse> {
    try {
      const result = await this.notificationService.createRoleNotification(
        dto,
        req.user.id
      );

      return {
        success: true,
        message: `Notification sent to ${dto.role} users successfully`,
        data: result,
      };
    } catch (error) {
      const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      return {
        success: false,
        message: error.message || "Failed to send role notification",
        error: error.message,
      };
    }
  }

  @Post("user")
  @HttpCode(HttpStatus.CREATED)
  @ApiSuccess({ summary: "Send notification to one user", dataType: "Created notification", status: HttpStatus.CREATED })
  @ApiBody({ type: CreateUserNotificationDto })
  @ApiStandardErrors({ unauthorized: true, forbidden: true })
  async createUserNotification(
    @Body() dto: CreateUserNotificationDto,
    @Request() req
  ): Promise<ApiResponse> {
    try {
      const notification =
        await this.notificationService.createUserNotification(dto, req.user.id);

      return {
        success: true,
        message: "User notification sent successfully",
        data: notification,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to send user notification",
        error: error.message,
      };
    }
  }

  @Post("maintenance")
  @HttpCode(HttpStatus.CREATED)
  @ApiSuccess({ summary: "Send maintenance notification to all users", dataType: "Notification campaign result", status: HttpStatus.CREATED })
  @ApiBody({ type: CreateBroadcastNotificationDto })
  @ApiStandardErrors({ unauthorized: true, forbidden: true })
  async sendMaintenanceNotification(
    @Body() dto: CreateBroadcastNotificationDto,
    @Request() req
  ): Promise<ApiResponse> {
    try {
      const result =
        await this.notificationService.sendMaintenanceNotification(
          dto,
          req.user.id
        );

      return {
        success: true,
        message: "Maintenance notification sent to all users",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to send maintenance notification",
        error: error.message,
      };
    }
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "List admin notification campaigns", dataType: "Paginated admin notifications" })
  @ApiPaginationQueries()
  @ApiQuery({ name: "targetType", required: false, enum: NotificationTargetType })
  @ApiQuery({ name: "type", required: false, enum: NotificationType })
  @ApiQuery({ name: "startDate", required: false, type: String, example: "2026-05-01" })
  @ApiQuery({ name: "endDate", required: false, type: String, example: "2026-05-16" })
  @ApiStandardErrors({ unauthorized: true, forbidden: true })
  async getAdminNotifications(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("targetType") targetType?: NotificationTargetType,
    @Query("type") type?: NotificationType,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ): Promise<ApiResponse> {
    try {
      const result = await this.notificationService.getAdminNotifications({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        targetType,
        type,
        startDate,
        endDate,
      });

      return {
        success: true,
        message: "Admin notifications retrieved successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve admin notifications",
        error: error.message,
      };
    }
  }

  @Get("stats")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Get admin notification statistics", dataType: "Admin notification statistics" })
  @ApiStandardErrors({ unauthorized: true, forbidden: true })
  async getAdminStats(): Promise<ApiResponse> {
    try {
      const stats = await this.notificationService.getAdminStats();

      return {
        success: true,
        message: "Admin notification stats retrieved successfully",
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve admin stats",
        error: error.message,
      };
    }
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Delete an admin notification record", dataType: "null" })
  @ApiIdParam("id", "Notification ID")
  @ApiStandardErrors({ unauthorized: true, forbidden: true, notFound: true })
  async deleteNotification(
    @Param("id", ParseIntPipe) id: number
  ): Promise<ApiResponse> {
    try {
      await this.notificationService.deleteNotification(id);

      return {
        success: true,
        message: "Notification deleted successfully",
        data: null,
      };
    } catch (error) {
      const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      return {
        success: false,
        message: error.message || "Failed to delete notification",
        error: error.message,
      };
    }
  }

  // Quick action endpoints
  @Post("quick/welcome/:userId")
  @HttpCode(HttpStatus.CREATED)
  @ApiSuccess({ summary: "Send quick welcome notification to user", dataType: "null", status: HttpStatus.CREATED })
  @ApiIdParam("userId", "User ID")
  @ApiStandardErrors({ unauthorized: true, forbidden: true, notFound: true })
  async sendWelcomeNotification(
    @Param("userId", ParseIntPipe) userId: number
  ): Promise<ApiResponse> {
    try {
      await this.notificationService.sendWelcomeNotification(userId);

      return {
        success: true,
        message: "Welcome notification sent successfully",
        data: null,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to send welcome notification",
        error: error.message,
      };
    }
  }

  @Post("quick/password-reset/:userId")
  @HttpCode(HttpStatus.CREATED)
  @ApiSuccess({ summary: "Send quick password reset notification to user", dataType: "null", status: HttpStatus.CREATED })
  @ApiIdParam("userId", "User ID")
  @ApiStandardErrors({ unauthorized: true, forbidden: true, notFound: true })
  async sendPasswordResetNotification(
    @Param("userId", ParseIntPipe) userId: number
  ): Promise<ApiResponse> {
    try {
      await this.notificationService.sendPasswordResetNotification(userId);

      return {
        success: true,
        message: "Password reset notification sent successfully",
        data: null,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to send password reset notification",
        error: error.message,
      };
    }
  }
}
