import {
  Controller,
  Get,
  Put,
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
import { ApiResponse } from "../interfaces/api.interface";
import { GetNotificationsQueryDto } from "../dto/notification.dto";

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getUserNotifications(
    @Request() req,
    @Query() query: GetNotificationsQueryDto
  ): Promise<ApiResponse> {
    try {
      const result = await this.notificationService.getUserNotifications(
        req.user.id,
        query
      );

      return {
        success: true,
        message: "Notifications retrieved successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve notifications",
        error: error.message,
      };
    }
  }

  @Get("unread-count")
  @HttpCode(HttpStatus.OK)
  async getUnreadCount(@Request() req): Promise<ApiResponse> {
    try {
      const count = await this.notificationService.getUnreadCount(req.user.id);

      return {
        success: true,
        message: "Unread count retrieved successfully",
        data: { count },
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve unread count",
        error: error.message,
      };
    }
  }

  @Get("stats")
  @HttpCode(HttpStatus.OK)
  async getUserStats(@Request() req): Promise<ApiResponse> {
    try {
      const stats = await this.notificationService.getUserStats(req.user.id);

      return {
        success: true,
        message: "Notification stats retrieved successfully",
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve notification stats",
        error: error.message,
      };
    }
  }

  @Put(":id/read")
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Param("id", ParseIntPipe) id: number,
    @Request() req
  ): Promise<ApiResponse> {
    try {
      const notification = await this.notificationService.markAsRead(
        id,
        req.user.id
      );

      return {
        success: true,
        message: "Notification marked as read",
        data: notification,
      };
    } catch (error) {
      const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      return {
        success: false,
        message: error.message || "Failed to mark notification as read",
        error: error.message,
      };
    }
  }

  @Put("read-all")
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@Request() req): Promise<ApiResponse> {
    try {
      await this.notificationService.markAllAsRead(req.user.id);

      return {
        success: true,
        message: "All notifications marked as read",
        data: null,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to mark all notifications as read",
        error: error.message,
      };
    }
  }
}
