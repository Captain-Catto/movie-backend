import {
  Controller,
  Post,
  Get,
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
import { NotificationService } from "../services/notification.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";
import { Roles } from "../decorators/roles.decorator";
import { UserRole } from "../entities/user.entity";
import { ApiResponse } from "../interfaces/api.interface";
import {
  CreateBroadcastNotificationDto,
  CreateRoleNotificationDto,
  CreateUserNotificationDto,
} from "../dto/notification.dto";
import {
  NotificationTargetType,
  NotificationType,
} from "../entities/notification-template.entity";

@Controller("admin/notifications")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminNotificationController {
  constructor(private notificationService: NotificationService) {}

  @Post("broadcast")
  @HttpCode(HttpStatus.CREATED)
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
  async getAdminNotifications(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("targetType") targetType?: NotificationTargetType,
    @Query("type") type?: NotificationType
  ): Promise<ApiResponse> {
    try {
      const result = await this.notificationService.getAdminNotifications({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        targetType,
        type,
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
