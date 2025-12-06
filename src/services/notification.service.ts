import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import {
  NotificationTemplateRepository,
  UserNotificationStateRepository,
  NotificationAnalyticsRepository,
} from "../repositories/notification-template.repository";
import {
  NotificationTemplate,
  NotificationType,
  NotificationTargetType,
} from "../entities/notification-template.entity";
import { NotificationState } from "../entities/user-notification-state.entity";
import { UserRole } from "../entities/user.entity";
import {
  CreateNotificationDto,
  CreateBroadcastNotificationDto,
  CreateRoleNotificationDto,
  CreateUserNotificationDto,
  GetNotificationsQueryDto,
  NotificationResponseDto,
  NotificationStatsDto,
} from "../dto/notification.dto";
import { NotificationGatewayInterface } from "../interfaces/notification-gateway.interface";

@Injectable()
export class NotificationService {
  constructor(
    private templateRepository: NotificationTemplateRepository,
    private userStateRepository: UserNotificationStateRepository,
    private analyticsRepository: NotificationAnalyticsRepository,
    @Inject(forwardRef(() => "NotificationGateway"))
    private notificationGateway: NotificationGatewayInterface
  ) {}

  // ✅ OPTIMIZED: Template-based user notifications
  async getUserNotifications(
    userId: number,
    query: GetNotificationsQueryDto
  ): Promise<{
    notifications: NotificationResponseDto[];
    total: number;
    totalPages: number;
  }> {
    // Get user's roles to determine applicable templates
    const userRoles = await this.getUserRoles(userId);

    // Get templates that apply to this user
    const { templates, total } = await this.templateRepository.findForUser(
      userId,
      userRoles,
      query
    );

    // Get user's states for these templates
    const templateIds = templates.map((t) => t.id);
    const userStates = await this.userStateRepository.findByUserAndTemplates(
      userId,
      templateIds
    );

    // Combine templates with user states
    const notifications = await Promise.all(
      templates.map(async (template) => {
        const userState = userStates.find((s) => s.templateId === template.id);
        return await this.formatTemplateToNotification(template, userState);
      })
    );

    const totalPages = Math.ceil(total / (query.limit || 20));

    return {
      notifications,
      total,
      totalPages,
    };
  }

  // ✅ OPTIMIZED: Efficient unread count
  async getUnreadCount(userId: number): Promise<number> {
    // Get user's roles
    const userRoles = await this.getUserRoles(userId);

    // Get all applicable template IDs (without pagination)
    const { templates } = await this.templateRepository.findForUser(
      userId,
      userRoles,
      { limit: 1000 } // Get all applicable templates
    );

    const templateIds = templates.map((t) => t.id);

    // Calculate unread count efficiently
    return await this.userStateRepository.getUnreadCount(userId, templateIds);
  }

  // ✅ OPTIMIZED: Template-based mark as read
  async markAsRead(
    templateId: number,
    userId: number
  ): Promise<NotificationResponseDto> {
    const template = await this.templateRepository.findById(templateId);

    if (!template) {
      throw new NotFoundException("Notification not found");
    }

    // Check if user is eligible for this template
    const userRoles = await this.getUserRoles(userId);
    if (!this.isUserEligibleForTemplate(userId, userRoles, template)) {
      throw new ForbiddenException("You can only read your own notifications");
    }

    // Mark as read (create/update user state)
    const userState = await this.userStateRepository.markAsRead(
      templateId,
      userId
    );

    // Update analytics
    await this.analyticsRepository.incrementReadCount(templateId);

    return await this.formatTemplateToNotification(template, userState);
  }

  async markAllAsRead(userId: number): Promise<void> {
    // Get user's roles to determine applicable templates
    const userRoles = await this.getUserRoles(userId);

    // Get all applicable template IDs
    const { templates } = await this.templateRepository.findForUser(
      userId,
      userRoles,
      { limit: 1000 } // Get all applicable templates
    );

    const templateIds = templates.map((t) => t.id);

    // Mark all applicable templates as read (create states if needed)
    if (templateIds.length > 0) {
      await this.userStateRepository.markAllAsRead(userId, templateIds);
    }
  }

  async getUserStats(userId: number): Promise<NotificationStatsDto> {
    const userRoles = await this.getUserRoles(userId);

    // Get recent notifications
    const { notifications } = await this.getUserNotifications(userId, {
      page: 1,
      limit: 5,
    });

    const unreadCount = await this.getUnreadCount(userId);
    const totalCount = notifications.length;

    return {
      total: totalCount,
      unread: unreadCount,
      read: totalCount - unreadCount,
      recent: notifications,
    };
  }

  // ✅ SUPER EFFICIENT: Broadcast notification (1 template vs 1000 records)
  async createBroadcastNotification(
    dto: CreateBroadcastNotificationDto,
    senderId: number
  ): Promise<{ success: boolean; notificationsSent: number }> {
    // Create single template
    const template = await this.templateRepository.create({
      title: dto.title,
      message: dto.message,
      type: dto.type || NotificationType.INFO,
      targetType: NotificationTargetType.ALL,
      targetValue: "all",
      senderId,
      expiresAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
    });

    // Get count of active users for analytics
    const users = await this.templateRepository.getAllActiveUsers();
    const userCount = users.length;

    // Create analytics record
    await this.analyticsRepository.create({
      templateId: template.id,
      totalTargetedUsers: userCount,
      deliveredCount: userCount,
    });

    // Send real-time notifications
    if (this.notificationGateway) {
      const notificationData = {
        id: template.id,
        title: dto.title,
        message: dto.message,
        type: dto.type || NotificationType.INFO,
        createdAt: template.createdAt,
      };

      try {
        await this.notificationGateway.broadcastNotification(notificationData);
      } catch (error) {
        console.error(
          "Failed to send real-time broadcast notification:",
          error
        );
      }
    }

    return {
      success: true,
      notificationsSent: userCount,
    };
  }

  // ✅ EFFICIENT: Role notification (1 template vs N user records)
  async createRoleNotification(
    dto: CreateRoleNotificationDto,
    senderId: number
  ): Promise<{ success: boolean; notificationsSent: number }> {
    // Convert string role to UserRole enum
    const roleMap: { [key: string]: UserRole } = {
      user: UserRole.USER,
      admin: UserRole.ADMIN,
      super_admin: UserRole.SUPER_ADMIN,
    };

    const userRole = roleMap[dto.role.toLowerCase()];
    if (!userRole) {
      throw new NotFoundException(`Invalid role: ${dto.role}`);
    }

    // Create single template
    const template = await this.templateRepository.create({
      title: dto.title,
      message: dto.message,
      type: dto.type || NotificationType.INFO,
      targetType: NotificationTargetType.ROLE,
      targetValue: dto.role,
      senderId,
      expiresAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
    });

    // Get users count for analytics
    const users = await this.templateRepository.getUsersByRole(userRole);
    const userCount = users.length;

    // Create analytics record
    await this.analyticsRepository.create({
      templateId: template.id,
      totalTargetedUsers: userCount,
      deliveredCount: userCount,
    });

    // Send real-time notifications
    if (this.notificationGateway) {
      const notificationData = {
        id: template.id,
        title: dto.title,
        message: dto.message,
        type: dto.type || NotificationType.INFO,
        createdAt: template.createdAt,
      };

      try {
        await this.notificationGateway.sendNotificationToRole(
          dto.role,
          notificationData
        );
      } catch (error) {
        console.error("Failed to send real-time role notification:", error);
      }
    }

    return {
      success: true,
      notificationsSent: userCount,
    };
  }

  async createUserNotification(
    dto: CreateUserNotificationDto,
    senderId: number
  ): Promise<NotificationResponseDto> {
    // Create template for specific user
    const template = await this.templateRepository.create({
      title: dto.title,
      message: dto.message,
      type: dto.type || NotificationType.INFO,
      targetType: NotificationTargetType.USER,
      targetValue: dto.userId.toString(),
      senderId,
      expiresAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      metadata: dto.metadata,
    });

    // Create analytics record
    await this.analyticsRepository.create({
      templateId: template.id,
      totalTargetedUsers: 1,
      deliveredCount: 1,
    });

    // Send real-time notification
    if (this.notificationGateway) {
      const realtimeData = {
        id: template.id,
        title: template.title,
        message: template.message,
        type: template.type,
        createdAt: template.createdAt,
        metadata: template.metadata,
      };

      try {
        await this.notificationGateway.sendNotificationToUser(
          dto.userId,
          realtimeData
        );
      } catch (error) {
        console.error("Failed to send real-time user notification:", error);
      }
    }

    return await this.formatTemplateToNotification(template);
  }

  async createSystemNotification(
    title: string,
    message: string,
    userId: number,
    type: NotificationType = NotificationType.SYSTEM
  ): Promise<NotificationResponseDto> {
    const template = await this.templateRepository.create({
      title,
      message,
      type,
      targetType: NotificationTargetType.USER,
      targetValue: userId.toString(),
      senderId: null, // System notifications have no sender
    });

    // Create analytics record
    await this.analyticsRepository.create({
      templateId: template.id,
      totalTargetedUsers: 1,
      deliveredCount: 1,
    });

    return await this.formatTemplateToNotification(template);
  }

  // Admin methods
  async getAdminNotifications(options: {
    page?: number;
    limit?: number;
    targetType?: NotificationTargetType;
    type?: NotificationType;
  }): Promise<{
    notifications: NotificationResponseDto[];
    total: number;
    totalPages: number;
  }> {
    const { templates, total } = await this.templateRepository.findAllForAdmin(
      options
    );

    const notifications = await Promise.all(
      templates.map((template) =>
        this.formatTemplateToNotification(template, undefined, true)
      )
    );

    const totalPages = Math.ceil(total / (options.limit || 20));

    return {
      notifications,
      total,
      totalPages,
    };
  }

  async getAdminStats(): Promise<{
    totalSent: number;
    totalUsers: number;
    totalUnread: number;
    totalRead: number;
  }> {
    return await this.analyticsRepository.getAdminStats();
  }

  async deleteNotification(templateId: number): Promise<void> {
    await this.templateRepository.deleteById(templateId);
  }

  // Quick action methods for admin controller
  async sendMaintenanceNotification(
    dto: CreateBroadcastNotificationDto,
    senderId: number
  ): Promise<{
    success: boolean;
    notificationsSent: number;
  }> {
    // Use the provided message or create one from metadata if available
    let message = dto.message;

    // If startTime and endTime are provided in metadata, append to message
    if (dto.metadata?.startTime && dto.metadata?.endTime) {
      const startTime = new Date(dto.metadata.startTime).toLocaleString();
      const endTime = new Date(dto.metadata.endTime).toLocaleString();
      message += `\n\nScheduled Time: ${startTime} to ${endTime}`;
    }

    return await this.createBroadcastNotification(
      {
        title: dto.title || "Scheduled Maintenance",
        message,
        type: NotificationType.WARNING,
        metadata: dto.metadata,
      },
      senderId
    );
  }

  async sendWelcomeNotification(
    userId: number
  ): Promise<NotificationResponseDto> {
    const template = await this.templateRepository.create({
      title: "Welcome to our platform!",
      message:
        "Thank you for joining us. Explore our features and enjoy your experience!",
      type: NotificationType.SUCCESS,
      targetType: NotificationTargetType.USER,
      targetValue: userId.toString(),
      senderId: null, // System notification
    });

    await this.analyticsRepository.create({
      templateId: template.id,
      totalTargetedUsers: 1,
      deliveredCount: 1,
    });

    return await this.formatTemplateToNotification(template);
  }

  async sendPasswordResetNotification(
    userId: number
  ): Promise<NotificationResponseDto> {
    const template = await this.templateRepository.create({
      title: "Password Reset Successful",
      message:
        "Your password has been successfully reset. If you didn't request this change, please contact support immediately.",
      type: NotificationType.INFO,
      targetType: NotificationTargetType.USER,
      targetValue: userId.toString(),
      senderId: null, // System notification
    });

    await this.analyticsRepository.create({
      templateId: template.id,
      totalTargetedUsers: 1,
      deliveredCount: 1,
    });

    return await this.formatTemplateToNotification(template);
  }

  // Helper methods
  private async getUserRoles(userId: number): Promise<UserRole[]> {
    // This would typically come from user entity or be passed from auth
    // For now, assume we have a way to get user roles
    const users = await this.templateRepository.getAllActiveUsers();
    const user = users.find((u) => u.id === userId);
    return user ? [user.role] : [UserRole.USER];
  }

  private isUserEligibleForTemplate(
    userId: number,
    userRoles: UserRole[],
    template: NotificationTemplate
  ): boolean {
    switch (template.targetType) {
      case NotificationTargetType.ALL:
        return true;
      case NotificationTargetType.USER:
        return template.targetValue === userId.toString();
      case NotificationTargetType.ROLE:
        return userRoles.includes(template.targetValue as UserRole);
      default:
        return false;
    }
  }

  private async formatTemplateToNotification(
    template: NotificationTemplate,
    userState?: any,
    includeAnalytics = false
  ): Promise<NotificationResponseDto> {
    const base = {
      id: template.id,
      title: template.title,
      message: template.message,
      type: template.type,
      targetType: template.targetType,
      targetValue: template.targetValue,
      isRead: userState?.readAt ? true : false,
      readAt: userState?.readAt || null,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      expiresAt: template.expiresAt,
      priority: template.priority,
      metadata: template.metadata,
    };

    const createdBy = template.sender
      ? {
          id: template.sender.id,
          email: template.sender.email,
          name: template.sender.name,
        }
      : null;

    if (includeAnalytics) {
      const analyticsEntity =
        await this.analyticsRepository.findByTemplateId(template.id);
      const analytics = {
        totalTargetedUsers: analyticsEntity?.totalTargetedUsers ?? 0,
        deliveredCount: analyticsEntity?.deliveredCount ?? 0,
        readCount: analyticsEntity?.readCount ?? 0,
        dismissedCount: analyticsEntity?.dismissedCount ?? 0,
        clickCount: analyticsEntity?.clickCount ?? 0,
      };

      return {
        ...base,
        analytics,
        createdBy,
      };
    }

    return {
      ...base,
      createdBy,
    };
  }
}
