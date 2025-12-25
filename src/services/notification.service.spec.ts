import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

// Mock entities and enums
vi.mock('../entities/notification-template.entity', () => ({
  NotificationTemplate: class NotificationTemplate {},
  NotificationType: {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    SUCCESS: 'success',
    SYSTEM: 'system',
  },
  NotificationTargetType: {
    ALL: 'all',
    ROLE: 'role',
    USER: 'user',
  },
}));

vi.mock('../entities/user-notification-state.entity', () => ({
  NotificationState: class NotificationState {},
}));

vi.mock('../entities/user.entity', () => ({
  UserRole: {
    USER: 'user',
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin',
    VIEWER: 'viewer',
  },
}));

const { NotificationService } = await import('./notification.service');
const { NotificationType, NotificationTargetType } = await import(
  '../entities/notification-template.entity'
);
const { UserRole } = await import('../entities/user.entity');

describe('NotificationService', () => {
  let service: NotificationService;
  let templateRepository: any;
  let userStateRepository: any;
  let analyticsRepository: any;
  let notificationGateway: any;

  beforeEach(() => {
    // Mock repositories
    templateRepository = {
      findForUser: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      getAllActiveUsers: vi.fn(),
      getUsersByRole: vi.fn(),
      findAllForAdmin: vi.fn(),
      deleteById: vi.fn(),
    };

    userStateRepository = {
      findByUserAndTemplates: vi.fn(),
      getUnreadCount: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
    };

    analyticsRepository = {
      incrementReadCount: vi.fn(),
      create: vi.fn(),
      findByTemplateId: vi.fn(),
      getAdminStats: vi.fn(),
    };

    notificationGateway = {
      broadcastNotification: vi.fn(),
      sendNotificationToRole: vi.fn(),
      sendNotificationToUser: vi.fn(),
    };

    service = new NotificationService(
      templateRepository,
      userStateRepository,
      analyticsRepository,
      notificationGateway
    );
  });

  describe('getUserNotifications', () => {
    it('should get user notifications with pagination', async () => {
      const mockTemplates = [
        {
          id: 1,
          title: 'Test Notification',
          message: 'Test message',
          type: NotificationType.INFO,
          targetType: NotificationTargetType.ALL,
          targetValue: 'all',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockUsers = [{ id: 1, role: UserRole.USER }];
      const mockUserStates = [{ templateId: 1, readAt: null }];

      templateRepository.getAllActiveUsers.mockResolvedValue(mockUsers);
      templateRepository.findForUser.mockResolvedValue({
        templates: mockTemplates,
        total: 1,
      });
      userStateRepository.findByUserAndTemplates.mockResolvedValue(mockUserStates);

      const result = await service.getUserNotifications(1, { page: 1, limit: 20 });

      expect(result.total).toBe(1);
      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].title).toBe('Test Notification');
      expect(result.notifications[0].isRead).toBe(false);
    });

    it('should handle empty notifications', async () => {
      const mockUsers = [{ id: 1, role: UserRole.USER }];

      templateRepository.getAllActiveUsers.mockResolvedValue(mockUsers);
      templateRepository.findForUser.mockResolvedValue({
        templates: [],
        total: 0,
      });
      userStateRepository.findByUserAndTemplates.mockResolvedValue([]);

      const result = await service.getUserNotifications(1, { page: 1, limit: 20 });

      expect(result.total).toBe(0);
      expect(result.notifications).toHaveLength(0);
    });
  });

  describe('getUnreadCount', () => {
    it('should get unread count for user', async () => {
      const mockUsers = [{ id: 1, role: UserRole.USER }];
      const mockTemplates = [
        { id: 1, title: 'Notification 1' },
        { id: 2, title: 'Notification 2' },
      ];

      templateRepository.getAllActiveUsers.mockResolvedValue(mockUsers);
      templateRepository.findForUser.mockResolvedValue({
        templates: mockTemplates,
        total: 2,
      });
      userStateRepository.getUnreadCount.mockResolvedValue(2);

      const count = await service.getUnreadCount(1);

      expect(count).toBe(2);
      expect(userStateRepository.getUnreadCount).toHaveBeenCalledWith(1, [1, 2]);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const mockTemplate = {
        id: 1,
        title: 'Test Notification',
        message: 'Test message',
        type: NotificationType.INFO,
        targetType: NotificationTargetType.ALL,
        targetValue: 'all',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUserState = {
        templateId: 1,
        userId: 1,
        readAt: new Date(),
      };

      const mockUsers = [{ id: 1, role: UserRole.USER }];

      templateRepository.findById.mockResolvedValue(mockTemplate);
      templateRepository.getAllActiveUsers.mockResolvedValue(mockUsers);
      userStateRepository.markAsRead.mockResolvedValue(mockUserState);
      analyticsRepository.incrementReadCount.mockResolvedValue(undefined);

      const result = await service.markAsRead(1, 1);

      expect(result.id).toBe(1);
      expect(result.isRead).toBe(true);
      expect(userStateRepository.markAsRead).toHaveBeenCalledWith(1, 1);
      expect(analyticsRepository.incrementReadCount).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when template not found', async () => {
      templateRepository.findById.mockResolvedValue(null);

      await expect(service.markAsRead(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user not eligible', async () => {
      const mockTemplate = {
        id: 1,
        title: 'User-specific',
        message: 'Test',
        type: NotificationType.INFO,
        targetType: NotificationTargetType.USER,
        targetValue: '99', // Different user
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUsers = [{ id: 1, role: UserRole.USER }];

      templateRepository.findById.mockResolvedValue(mockTemplate);
      templateRepository.getAllActiveUsers.mockResolvedValue(mockUsers);

      await expect(service.markAsRead(1, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      const mockUsers = [{ id: 1, role: UserRole.USER }];
      const mockTemplates = [
        { id: 1, title: 'Notification 1' },
        { id: 2, title: 'Notification 2' },
      ];

      templateRepository.getAllActiveUsers.mockResolvedValue(mockUsers);
      templateRepository.findForUser.mockResolvedValue({
        templates: mockTemplates,
        total: 2,
      });
      userStateRepository.markAllAsRead.mockResolvedValue(undefined);

      await service.markAllAsRead(1);

      expect(userStateRepository.markAllAsRead).toHaveBeenCalledWith(1, [1, 2]);
    });

    it('should not call markAllAsRead when no templates', async () => {
      const mockUsers = [{ id: 1, role: UserRole.USER }];

      templateRepository.getAllActiveUsers.mockResolvedValue(mockUsers);
      templateRepository.findForUser.mockResolvedValue({
        templates: [],
        total: 0,
      });

      await service.markAllAsRead(1);

      expect(userStateRepository.markAllAsRead).not.toHaveBeenCalled();
    });
  });

  describe('createBroadcastNotification', () => {
    it('should create broadcast notification', async () => {
      const mockTemplate = {
        id: 1,
        title: 'System Update',
        message: 'System will be updated',
        type: NotificationType.INFO,
        targetType: NotificationTargetType.ALL,
        targetValue: 'all',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUsers = [
        { id: 1, role: UserRole.USER },
        { id: 2, role: UserRole.USER },
      ];

      templateRepository.create.mockResolvedValue(mockTemplate);
      templateRepository.getAllActiveUsers.mockResolvedValue(mockUsers);
      analyticsRepository.create.mockResolvedValue({});
      notificationGateway.broadcastNotification.mockResolvedValue(undefined);

      const result = await service.createBroadcastNotification(
        {
          title: 'System Update',
          message: 'System will be updated',
          type: NotificationType.INFO,
        },
        1
      );

      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(2);
      expect(templateRepository.create).toHaveBeenCalled();
      expect(analyticsRepository.create).toHaveBeenCalledWith({
        templateId: 1,
        totalTargetedUsers: 2,
        deliveredCount: 2,
      });
      expect(notificationGateway.broadcastNotification).toHaveBeenCalled();
    });

    it('should handle gateway errors gracefully', async () => {
      const mockTemplate = {
        id: 1,
        title: 'Test',
        message: 'Test',
        type: NotificationType.INFO,
        targetType: NotificationTargetType.ALL,
        targetValue: 'all',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUsers = [{ id: 1, role: UserRole.USER }];

      templateRepository.create.mockResolvedValue(mockTemplate);
      templateRepository.getAllActiveUsers.mockResolvedValue(mockUsers);
      analyticsRepository.create.mockResolvedValue({});
      notificationGateway.broadcastNotification.mockRejectedValue(
        new Error('Gateway error')
      );

      // Should not throw even if gateway fails
      const result = await service.createBroadcastNotification(
        {
          title: 'Test',
          message: 'Test',
        },
        1
      );

      expect(result.success).toBe(true);
    });
  });

  describe('createRoleNotification', () => {
    it('should create role-specific notification', async () => {
      const mockTemplate = {
        id: 1,
        title: 'Admin Notice',
        message: 'Important for admins',
        type: NotificationType.WARNING,
        targetType: NotificationTargetType.ROLE,
        targetValue: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUsers = [
        { id: 1, role: UserRole.ADMIN },
        { id: 2, role: UserRole.ADMIN },
      ];

      templateRepository.create.mockResolvedValue(mockTemplate);
      templateRepository.getUsersByRole.mockResolvedValue(mockUsers);
      analyticsRepository.create.mockResolvedValue({});
      notificationGateway.sendNotificationToRole.mockResolvedValue(undefined);

      const result = await service.createRoleNotification(
        {
          title: 'Admin Notice',
          message: 'Important for admins',
          role: 'admin',
          type: NotificationType.WARNING,
        },
        1
      );

      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(2);
      expect(templateRepository.create).toHaveBeenCalled();
      expect(notificationGateway.sendNotificationToRole).toHaveBeenCalledWith(
        'admin',
        expect.any(Object)
      );
    });

    it('should throw NotFoundException for invalid role', async () => {
      await expect(
        service.createRoleNotification(
          {
            title: 'Test',
            message: 'Test',
            role: 'invalid_role',
          },
          1
        )
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createUserNotification', () => {
    it('should create user-specific notification', async () => {
      const mockTemplate = {
        id: 1,
        title: 'Personal Message',
        message: 'You have a new message',
        type: NotificationType.INFO,
        targetType: NotificationTargetType.USER,
        targetValue: '5',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: { foo: 'bar' },
      };

      templateRepository.create.mockResolvedValue(mockTemplate);
      analyticsRepository.create.mockResolvedValue({});
      notificationGateway.sendNotificationToUser.mockResolvedValue(undefined);

      const result = await service.createUserNotification(
        {
          title: 'Personal Message',
          message: 'You have a new message',
          userId: 5,
          type: NotificationType.INFO,
          metadata: { foo: 'bar' },
        },
        1
      );

      expect(result.id).toBe(1);
      expect(result.title).toBe('Personal Message');
      expect(analyticsRepository.create).toHaveBeenCalledWith({
        templateId: 1,
        totalTargetedUsers: 1,
        deliveredCount: 1,
      });
      expect(notificationGateway.sendNotificationToUser).toHaveBeenCalledWith(
        5,
        expect.any(Object)
      );
    });
  });

  describe('createSystemNotification', () => {
    it('should create system notification', async () => {
      const mockTemplate = {
        id: 1,
        title: 'System Alert',
        message: 'System maintenance',
        type: NotificationType.SYSTEM,
        targetType: NotificationTargetType.USER,
        targetValue: '1',
        senderId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      templateRepository.create.mockResolvedValue(mockTemplate);
      analyticsRepository.create.mockResolvedValue({});

      const result = await service.createSystemNotification(
        'System Alert',
        'System maintenance',
        1,
        NotificationType.SYSTEM
      );

      expect(result.id).toBe(1);
      expect(result.title).toBe('System Alert');
      expect(templateRepository.create).toHaveBeenCalledWith({
        title: 'System Alert',
        message: 'System maintenance',
        type: NotificationType.SYSTEM,
        targetType: NotificationTargetType.USER,
        targetValue: '1',
        senderId: null,
      });
    });
  });

  describe('getAdminNotifications', () => {
    it('should get admin notifications with filters', async () => {
      const mockTemplates = [
        {
          id: 1,
          title: 'Notification 1',
          message: 'Message 1',
          type: NotificationType.INFO,
          targetType: NotificationTargetType.ALL,
          targetValue: 'all',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      templateRepository.findAllForAdmin.mockResolvedValue({
        templates: mockTemplates,
        total: 1,
      });
      analyticsRepository.findByTemplateId.mockResolvedValue({
        totalTargetedUsers: 100,
        deliveredCount: 100,
        readCount: 50,
        dismissedCount: 10,
        clickCount: 20,
      });

      const result = await service.getAdminNotifications({
        page: 1,
        limit: 20,
        targetType: NotificationTargetType.ALL,
      });

      expect(result.total).toBe(1);
      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].analytics).toBeDefined();
    });
  });

  describe('getAdminStats', () => {
    it('should get admin statistics', async () => {
      const mockStats = {
        totalSent: 100,
        totalUsers: 50,
        totalUnread: 30,
        totalRead: 20,
      };

      analyticsRepository.getAdminStats.mockResolvedValue(mockStats);

      const result = await service.getAdminStats();

      expect(result).toEqual(mockStats);
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification template', async () => {
      templateRepository.deleteById.mockResolvedValue(undefined);

      await service.deleteNotification(1);

      expect(templateRepository.deleteById).toHaveBeenCalledWith(1);
    });
  });

  describe('sendMaintenanceNotification', () => {
    it('should send maintenance notification with time details', async () => {
      const mockTemplate = {
        id: 1,
        title: 'Scheduled Maintenance',
        message: 'System maintenance at 2AM',
        type: NotificationType.WARNING,
        targetType: NotificationTargetType.ALL,
        targetValue: 'all',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUsers = [{ id: 1, role: UserRole.USER }];

      templateRepository.create.mockResolvedValue(mockTemplate);
      templateRepository.getAllActiveUsers.mockResolvedValue(mockUsers);
      analyticsRepository.create.mockResolvedValue({});
      notificationGateway.broadcastNotification.mockResolvedValue(undefined);

      const result = await service.sendMaintenanceNotification(
        {
          title: 'Scheduled Maintenance',
          message: 'System maintenance at 2AM',
          metadata: {
            startTime: '2024-01-01T02:00:00Z',
            endTime: '2024-01-01T04:00:00Z',
          },
        },
        1
      );

      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(1);
    });
  });

  describe('sendWelcomeNotification', () => {
    it('should send welcome notification', async () => {
      const mockTemplate = {
        id: 1,
        title: 'Welcome to our platform!',
        message: 'Thank you for joining us. Explore our features and enjoy your experience!',
        type: NotificationType.SUCCESS,
        targetType: NotificationTargetType.USER,
        targetValue: '1',
        senderId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      templateRepository.create.mockResolvedValue(mockTemplate);
      analyticsRepository.create.mockResolvedValue({});

      const result = await service.sendWelcomeNotification(1);

      expect(result.title).toBe('Welcome to our platform!');
      expect(result.type).toBe(NotificationType.SUCCESS);
    });
  });

  describe('sendPasswordResetNotification', () => {
    it('should send password reset notification', async () => {
      const mockTemplate = {
        id: 1,
        title: 'Password Reset Successful',
        message:
          "Your password has been successfully reset. If you didn't request this change, please contact support immediately.",
        type: NotificationType.INFO,
        targetType: NotificationTargetType.USER,
        targetValue: '1',
        senderId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      templateRepository.create.mockResolvedValue(mockTemplate);
      analyticsRepository.create.mockResolvedValue({});

      const result = await service.sendPasswordResetNotification(1);

      expect(result.title).toBe('Password Reset Successful');
      expect(result.type).toBe(NotificationType.INFO);
    });
  });
});
