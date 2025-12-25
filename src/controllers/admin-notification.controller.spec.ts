import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock entities
vi.mock('../entities/user.entity', () => ({
  UserRole: {
    USER: 'user',
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin',
    VIEWER: 'viewer',
  },
}));

vi.mock('../entities/notification-template.entity', () => ({
  NotificationTargetType: {
    ALL: 'all',
    ROLE: 'role',
    USER: 'user',
  },
  NotificationType: {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    SUCCESS: 'success',
  },
}));

vi.mock('../entities/viewer-audit-log.entity', () => ({
  ViewerAuditLog: class ViewerAuditLog {},
}));

const { AdminNotificationController } = await import('./admin-notification.controller');
const { NotificationTargetType, NotificationType } = await import(
  '../entities/notification-template.entity'
);

describe('AdminNotificationController', () => {
  let controller: AdminNotificationController;
  let notificationService: any;

  beforeEach(() => {
    // Mock NotificationService
    notificationService = {
      createBroadcastNotification: vi.fn(),
      createRoleNotification: vi.fn(),
      createUserNotification: vi.fn(),
      sendMaintenanceNotification: vi.fn(),
      getAdminNotifications: vi.fn(),
      getAdminStats: vi.fn(),
      deleteNotification: vi.fn(),
      sendWelcomeNotification: vi.fn(),
      sendPasswordResetNotification: vi.fn(),
    };

    controller = new AdminNotificationController(notificationService);
  });

  describe('createBroadcastNotification', () => {
    it('should create broadcast notification successfully', async () => {
      const dto = {
        title: 'System Update',
        message: 'System will be updated tonight',
        type: NotificationType.INFO,
      };
      const mockReq = { user: { id: 1 } };
      const mockResult = {
        id: 1,
        title: 'System Update',
        sentCount: 100,
      };

      notificationService.createBroadcastNotification.mockResolvedValue(mockResult);

      const result = await controller.createBroadcastNotification(dto, mockReq);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Broadcast notification sent successfully');
      expect(result.data).toEqual(mockResult);
      expect(notificationService.createBroadcastNotification).toHaveBeenCalledWith(dto, 1);
    });

    it('should handle errors when creating broadcast notification', async () => {
      const dto = { title: 'Test', message: 'Test', type: NotificationType.INFO };
      const mockReq = { user: { id: 1 } };

      notificationService.createBroadcastNotification.mockRejectedValue(
        new Error('Database error')
      );

      const result = await controller.createBroadcastNotification(dto, mockReq);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to send broadcast notification');
      expect(result.error).toBe('Database error');
    });
  });

  describe('createRoleNotification', () => {
    it('should create role-specific notification', async () => {
      const dto = {
        title: 'Admin Announcement',
        message: 'Important message for admins',
        role: 'admin',
        type: NotificationType.WARNING,
      };
      const mockReq = { user: { id: 1 } };
      const mockResult = {
        id: 2,
        title: 'Admin Announcement',
        sentCount: 10,
      };

      notificationService.createRoleNotification.mockResolvedValue(mockResult);

      const result = await controller.createRoleNotification(dto, mockReq);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Notification sent to admin users successfully');
      expect(result.data).toEqual(mockResult);
      expect(notificationService.createRoleNotification).toHaveBeenCalledWith(dto, 1);
    });

    it('should handle errors with status code', async () => {
      const dto = { title: 'Test', message: 'Test', role: 'admin', type: NotificationType.INFO };
      const mockReq = { user: { id: 1 } };

      const error = new Error('Invalid role');
      error.status = 400;

      notificationService.createRoleNotification.mockRejectedValue(error);

      const result = await controller.createRoleNotification(dto, mockReq);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid role');
    });
  });

  describe('createUserNotification', () => {
    it('should create user-specific notification', async () => {
      const dto = {
        title: 'Personal Message',
        message: 'You have a new message',
        userId: 5,
        type: NotificationType.INFO,
      };
      const mockReq = { user: { id: 1 } };
      const mockNotification = {
        id: 3,
        title: 'Personal Message',
        userId: 5,
      };

      notificationService.createUserNotification.mockResolvedValue(mockNotification);

      const result = await controller.createUserNotification(dto, mockReq);

      expect(result.success).toBe(true);
      expect(result.message).toBe('User notification sent successfully');
      expect(result.data).toEqual(mockNotification);
      expect(notificationService.createUserNotification).toHaveBeenCalledWith(dto, 1);
    });

    it('should handle errors when creating user notification', async () => {
      const dto = { title: 'Test', message: 'Test', userId: 999, type: NotificationType.INFO };
      const mockReq = { user: { id: 1 } };

      notificationService.createUserNotification.mockRejectedValue(
        new Error('User not found')
      );

      const result = await controller.createUserNotification(dto, mockReq);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to send user notification');
    });
  });

  describe('sendMaintenanceNotification', () => {
    it('should send maintenance notification to all users', async () => {
      const dto = {
        title: 'Scheduled Maintenance',
        message: 'System maintenance at 2AM',
        type: NotificationType.WARNING,
      };
      const mockReq = { user: { id: 1 } };
      const mockResult = {
        id: 4,
        title: 'Scheduled Maintenance',
        sentCount: 150,
      };

      notificationService.sendMaintenanceNotification.mockResolvedValue(mockResult);

      const result = await controller.sendMaintenanceNotification(dto, mockReq);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Maintenance notification sent to all users');
      expect(result.data).toEqual(mockResult);
      expect(notificationService.sendMaintenanceNotification).toHaveBeenCalledWith(dto, 1);
    });

    it('should handle errors when sending maintenance notification', async () => {
      const dto = { title: 'Test', message: 'Test', type: NotificationType.WARNING };
      const mockReq = { user: { id: 1 } };

      notificationService.sendMaintenanceNotification.mockRejectedValue(
        new Error('Service unavailable')
      );

      const result = await controller.sendMaintenanceNotification(dto, mockReq);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to send maintenance notification');
    });
  });

  describe('getAdminNotifications', () => {
    it('should get admin notifications with default pagination', async () => {
      const mockResult = {
        notifications: [
          { id: 1, title: 'Notification 1' },
          { id: 2, title: 'Notification 2' },
        ],
        total: 2,
        page: 1,
        totalPages: 1,
      };

      notificationService.getAdminNotifications.mockResolvedValue(mockResult);

      const result = await controller.getAdminNotifications();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Admin notifications retrieved successfully');
      expect(result.data).toEqual(mockResult);
      expect(notificationService.getAdminNotifications).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        targetType: undefined,
        type: undefined,
      });
    });

    it('should filter by target type and notification type', async () => {
      notificationService.getAdminNotifications.mockResolvedValue({
        notifications: [],
        total: 0,
      });

      await controller.getAdminNotifications(
        2,
        10,
        NotificationTargetType.ROLE,
        NotificationType.WARNING
      );

      expect(notificationService.getAdminNotifications).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        targetType: NotificationTargetType.ROLE,
        type: NotificationType.WARNING,
      });
    });

    it('should handle errors when getting notifications', async () => {
      notificationService.getAdminNotifications.mockRejectedValue(
        new Error('Database error')
      );

      const result = await controller.getAdminNotifications();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to retrieve admin notifications');
    });
  });

  describe('getAdminStats', () => {
    it('should get admin notification statistics', async () => {
      const mockStats = {
        total: 100,
        byType: {
          info: 50,
          warning: 30,
          error: 10,
          success: 10,
        },
        byTargetType: {
          all: 40,
          role: 30,
          user: 30,
        },
        recent: [],
      };

      notificationService.getAdminStats.mockResolvedValue(mockStats);

      const result = await controller.getAdminStats();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Admin notification stats retrieved successfully');
      expect(result.data).toEqual(mockStats);
    });

    it('should handle errors when getting stats', async () => {
      notificationService.getAdminStats.mockRejectedValue(
        new Error('Query error')
      );

      const result = await controller.getAdminStats();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to retrieve admin stats');
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      notificationService.deleteNotification.mockResolvedValue(undefined);

      const result = await controller.deleteNotification(1);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Notification deleted successfully');
      expect(result.data).toBeNull();
      expect(notificationService.deleteNotification).toHaveBeenCalledWith(1);
    });

    it('should handle errors when deleting notification', async () => {
      const error = new Error('Notification not found');
      error.status = 404;

      notificationService.deleteNotification.mockRejectedValue(error);

      const result = await controller.deleteNotification(999);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Notification not found');
    });
  });

  describe('sendWelcomeNotification', () => {
    it('should send welcome notification to user', async () => {
      notificationService.sendWelcomeNotification.mockResolvedValue(undefined);

      const result = await controller.sendWelcomeNotification(1);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Welcome notification sent successfully');
      expect(result.data).toBeNull();
      expect(notificationService.sendWelcomeNotification).toHaveBeenCalledWith(1);
    });

    it('should handle errors when sending welcome notification', async () => {
      notificationService.sendWelcomeNotification.mockRejectedValue(
        new Error('User not found')
      );

      const result = await controller.sendWelcomeNotification(999);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to send welcome notification');
    });
  });

  describe('sendPasswordResetNotification', () => {
    it('should send password reset notification to user', async () => {
      notificationService.sendPasswordResetNotification.mockResolvedValue(undefined);

      const result = await controller.sendPasswordResetNotification(1);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Password reset notification sent successfully');
      expect(result.data).toBeNull();
      expect(notificationService.sendPasswordResetNotification).toHaveBeenCalledWith(1);
    });

    it('should handle errors when sending password reset notification', async () => {
      notificationService.sendPasswordResetNotification.mockRejectedValue(
        new Error('User not found')
      );

      const result = await controller.sendPasswordResetNotification(999);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to send password reset notification');
    });
  });
});
