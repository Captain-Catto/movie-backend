import {
  Controller,
  Delete,
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
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  ApiIdParam,
  ApiPaginationQueries,
  ApiStandardErrors,
  ApiSuccess,
} from "../swagger/api-response.decorators";

@ApiTags('Notifications')
@ApiBearerAuth('JWT')
@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({
    summary: "List authenticated user's notifications",
    dataType: "Notification list",
  })
  @ApiPaginationQueries()
  @ApiStandardErrors({ unauthorized: true })
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
  @ApiSuccess({
    summary: "Get authenticated user's unread notification count",
    dataType: "Unread notification count",
  })
  @ApiStandardErrors({ unauthorized: true })
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
  @ApiSuccess({
    summary: "Get authenticated user's notification statistics",
    dataType: "Notification statistics",
  })
  @ApiStandardErrors({ unauthorized: true })
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
  @ApiSuccess({
    summary: "Mark a notification as read",
    dataType: "Updated notification",
  })
  @ApiIdParam("id", "Notification ID")
  @ApiStandardErrors({ unauthorized: true, notFound: true })
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
  @ApiSuccess({
    summary: "Mark all notifications as read",
    dataType: "null",
  })
  @ApiStandardErrors({ unauthorized: true })
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

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({
    summary: "Delete one notification from user's inbox",
    dataType: "null",
  })
  @ApiIdParam("id", "Notification ID")
  @ApiStandardErrors({ unauthorized: true, notFound: true })
  async dismissNotification(
    @Param("id", ParseIntPipe) id: number,
    @Request() req
  ): Promise<ApiResponse> {
    try {
      await this.notificationService.dismissNotification(id, req.user.id);

      return {
        success: true,
        message: "Notification deleted",
        data: null,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to delete notification",
        error: error.message,
      };
    }
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({
    summary: "Delete all notifications from user's inbox",
    dataType: "null",
  })
  @ApiStandardErrors({ unauthorized: true })
  async dismissAllNotifications(@Request() req): Promise<ApiResponse> {
    try {
      await this.notificationService.dismissAllNotifications(req.user.id);

      return {
        success: true,
        message: "All notifications deleted",
        data: null,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to delete notifications",
        error: error.message,
      };
    }
  }
}
