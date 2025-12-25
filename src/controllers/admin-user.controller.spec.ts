import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock entities
vi.mock('../entities/user.entity', () => ({
  User: class User {},
  UserRole: {
    USER: 'user',
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin',
    VIEWER: 'viewer',
  },
}));

vi.mock('../entities/viewer-audit-log.entity', () => ({
  ViewerAuditLog: class ViewerAuditLog {},
}));

const { AdminUserController } = await import('./admin-user.controller');
const { UserRole } = await import('../entities/user.entity');

describe('AdminUserController', () => {
  let controller: AdminUserController;
  let adminUserService: any;

  beforeEach(() => {
    // Mock AdminUserService
    adminUserService = {
      getUsersList: vi.fn(),
      getUserDetails: vi.fn(),
      banUser: vi.fn(),
      unbanUser: vi.fn(),
      updateUserRole: vi.fn(),
      updateUserProfile: vi.fn(),
      getUserStats: vi.fn(),
    };

    controller = new AdminUserController(adminUserService);
  });

  describe('getUsersList', () => {
    it('should get users list with default pagination', async () => {
      const mockData = {
        items: [
          { id: 1, email: 'user1@test.com', name: 'User 1' },
          { id: 2, email: 'user2@test.com', name: 'User 2' },
        ],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      adminUserService.getUsersList.mockResolvedValue(mockData);

      const result = await controller.getUsersList();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Users list retrieved successfully');
      expect(result.data).toEqual(mockData);
      expect(adminUserService.getUsersList).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        status: undefined,
        role: undefined,
        search: undefined,
      });
    });

    it('should get users list with custom filters', async () => {
      const mockData = {
        items: [{ id: 1, email: 'admin@test.com', role: UserRole.ADMIN }],
        total: 1,
        page: 2,
        limit: 10,
        totalPages: 1,
      };

      adminUserService.getUsersList.mockResolvedValue(mockData);

      const result = await controller.getUsersList(2, 10, 'active', UserRole.ADMIN, 'admin');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(adminUserService.getUsersList).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        status: 'active',
        role: UserRole.ADMIN,
        search: 'admin',
      });
    });

    it('should filter by status: banned', async () => {
      const mockData = {
        items: [{ id: 5, email: 'banned@test.com', isActive: false }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      adminUserService.getUsersList.mockResolvedValue(mockData);

      const result = await controller.getUsersList(undefined, undefined, 'banned');

      expect(result.success).toBe(true);
      expect(adminUserService.getUsersList).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        status: 'banned',
        role: undefined,
        search: undefined,
      });
    });

    it('should handle errors gracefully', async () => {
      adminUserService.getUsersList.mockRejectedValue(new Error('Database error'));

      const result = await controller.getUsersList();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to retrieve users list');
      expect(result.error).toBe('Database error');
    });
  });

  describe('getUserDetails', () => {
    it('should get user details successfully', async () => {
      const mockData = {
        user: {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          role: UserRole.USER,
        },
        activities: [
          { id: 1, activityType: 'login', createdAt: new Date() },
        ],
        stats: {
          total: 10,
          logins: 5,
          searches: 2,
          views: 3,
          favorites: 1,
        },
      };

      adminUserService.getUserDetails.mockResolvedValue(mockData);

      const result = await controller.getUserDetails(1);

      expect(result.success).toBe(true);
      expect(result.message).toBe('User details retrieved successfully');
      expect(result.data).toEqual(mockData);
      expect(adminUserService.getUserDetails).toHaveBeenCalledWith(1);
    });

    it('should handle user not found error', async () => {
      adminUserService.getUserDetails.mockRejectedValue(
        new Error('User with ID 999 not found')
      );

      const result = await controller.getUserDetails(999);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to retrieve user details');
      expect(result.error).toBe('User with ID 999 not found');
    });

    it('should get admin user details', async () => {
      const mockData = {
        user: {
          id: 2,
          email: 'admin@example.com',
          role: UserRole.ADMIN,
        },
        activities: [],
        stats: { total: 0, logins: 0, searches: 0, views: 0, favorites: 0 },
      };

      adminUserService.getUserDetails.mockResolvedValue(mockData);

      const result = await controller.getUserDetails(2);

      expect(result.success).toBe(true);
      expect(result.data.user.role).toBe(UserRole.ADMIN);
    });
  });

  describe('banUser', () => {
    it('should ban user successfully', async () => {
      const mockReq = { user: { id: 2 } }; // Admin user
      const body = { userId: 1, reason: 'Violation of terms' };
      const mockBannedUser = {
        id: 1,
        email: 'user@test.com',
        isActive: false,
        bannedReason: 'Violation of terms',
        bannedBy: 2,
        bannedAt: new Date(),
      };

      adminUserService.banUser.mockResolvedValue(mockBannedUser);

      const result = await controller.banUser(body, mockReq);

      expect(result.success).toBe(true);
      expect(result.message).toBe('User banned successfully');
      expect(result.data).toEqual(mockBannedUser);
      expect(adminUserService.banUser).toHaveBeenCalledWith({
        userId: 1,
        reason: 'Violation of terms',
        bannedBy: 2,
      });
    });

    it('should handle ban user errors', async () => {
      const mockReq = { user: { id: 2 } };
      const body = { userId: 999, reason: 'Test' };

      adminUserService.banUser.mockRejectedValue(
        new Error('User with ID 999 not found')
      );

      const result = await controller.banUser(body, mockReq);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to ban user');
    });

    it('should extract adminId from request correctly', async () => {
      const mockReq = { user: { id: 5 } };
      const body = { userId: 3, reason: 'Spam' };

      adminUserService.banUser.mockResolvedValue({});

      await controller.banUser(body, mockReq);

      expect(adminUserService.banUser).toHaveBeenCalledWith({
        userId: 3,
        reason: 'Spam',
        bannedBy: 5,
      });
    });
  });

  describe('unbanUser', () => {
    it('should unban user successfully', async () => {
      const mockUnbannedUser = {
        id: 1,
        email: 'user@test.com',
        isActive: true,
        bannedReason: null,
        bannedBy: null,
        bannedAt: null,
      };

      adminUserService.unbanUser.mockResolvedValue(mockUnbannedUser);

      const result = await controller.unbanUser(1);

      expect(result.success).toBe(true);
      expect(result.message).toBe('User unbanned successfully');
      expect(result.data).toEqual(mockUnbannedUser);
      expect(adminUserService.unbanUser).toHaveBeenCalledWith(1);
    });

    it('should handle unban errors', async () => {
      adminUserService.unbanUser.mockRejectedValue(
        new Error('User with ID 999 not found')
      );

      const result = await controller.unbanUser(999);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to unban user');
    });
  });

  describe('updateUserRole', () => {
    it('should update user role successfully', async () => {
      const body = { role: UserRole.ADMIN };
      const mockUpdatedUser = {
        id: 1,
        email: 'user@test.com',
        role: UserRole.ADMIN,
      };

      adminUserService.updateUserRole.mockResolvedValue(mockUpdatedUser);

      const result = await controller.updateUserRole(1, body);

      expect(result.success).toBe(true);
      expect(result.message).toBe('User role updated successfully');
      expect(result.data).toEqual(mockUpdatedUser);
      expect(adminUserService.updateUserRole).toHaveBeenCalledWith(1, UserRole.ADMIN);
    });

    it('should update to VIEWER role', async () => {
      const body = { role: UserRole.VIEWER };
      const mockUpdatedUser = {
        id: 2,
        email: 'viewer@test.com',
        role: UserRole.VIEWER,
      };

      adminUserService.updateUserRole.mockResolvedValue(mockUpdatedUser);

      const result = await controller.updateUserRole(2, body);

      expect(result.success).toBe(true);
      expect(result.data.role).toBe(UserRole.VIEWER);
    });

    it('should update to SUPER_ADMIN role', async () => {
      const body = { role: UserRole.SUPER_ADMIN };
      const mockUpdatedUser = {
        id: 3,
        email: 'superadmin@test.com',
        role: UserRole.SUPER_ADMIN,
      };

      adminUserService.updateUserRole.mockResolvedValue(mockUpdatedUser);

      const result = await controller.updateUserRole(3, body);

      expect(result.success).toBe(true);
      expect(result.data.role).toBe(UserRole.SUPER_ADMIN);
    });

    it('should handle update role errors', async () => {
      const body = { role: UserRole.ADMIN };

      adminUserService.updateUserRole.mockRejectedValue(
        new Error('User with ID 999 not found')
      );

      const result = await controller.updateUserRole(999, body);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to update user role');
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const body = {
        name: 'Updated Name',
        role: UserRole.ADMIN,
      };
      const mockUpdatedUser = {
        id: 1,
        email: 'user@test.com',
        name: 'Updated Name',
        role: UserRole.ADMIN,
      };

      adminUserService.updateUserProfile.mockResolvedValue(mockUpdatedUser);

      const result = await controller.updateUser(1, body);

      expect(result.success).toBe(true);
      expect(result.message).toBe('User updated successfully');
      expect(result.data).toEqual(mockUpdatedUser);
      expect(adminUserService.updateUserProfile).toHaveBeenCalledWith(1, body);
    });

    it('should update user with password', async () => {
      const body = {
        name: 'Test',
        password: 'newpassword123',
      };

      adminUserService.updateUserProfile.mockResolvedValue({
        id: 1,
        name: 'Test',
      });

      const result = await controller.updateUser(1, body);

      expect(result.success).toBe(true);
      expect(adminUserService.updateUserProfile).toHaveBeenCalledWith(1, body);
    });

    it('should update user active status', async () => {
      const body = { isActive: false };

      adminUserService.updateUserProfile.mockResolvedValue({
        id: 1,
        isActive: false,
      });

      const result = await controller.updateUser(1, body);

      expect(result.success).toBe(true);
    });

    it('should handle update errors', async () => {
      const body = { name: 'Test' };

      adminUserService.updateUserProfile.mockRejectedValue(
        new Error('User with ID 999 not found')
      );

      const result = await controller.updateUser(999, body);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to update user');
    });
  });

  describe('getUserStats', () => {
    it('should get user statistics successfully', async () => {
      const mockStats = {
        total: 100,
        active: 95,
        banned: 5,
        byRole: {
          admin: 10,
          superAdmin: 2,
          regularUser: 85,
        },
        byProvider: {
          email: 60,
          google: 40,
        },
        recentSignups: 15,
      };

      adminUserService.getUserStats.mockResolvedValue(mockStats);

      const result = await controller.getUserStats();

      expect(result.success).toBe(true);
      expect(result.message).toBe('User stats retrieved successfully');
      expect(result.data).toEqual(mockStats);
    });

    it('should handle stats retrieval errors', async () => {
      adminUserService.getUserStats.mockRejectedValue(
        new Error('Database error')
      );

      const result = await controller.getUserStats();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to retrieve user stats');
    });

    it('should return correct stats structure', async () => {
      const mockStats = {
        total: 50,
        active: 45,
        banned: 5,
        byRole: {
          admin: 5,
          superAdmin: 1,
          regularUser: 40,
        },
        byProvider: {
          email: 30,
          google: 20,
        },
        recentSignups: 8,
      };

      adminUserService.getUserStats.mockResolvedValue(mockStats);

      const result = await controller.getUserStats();

      expect(result.data).toHaveProperty('total');
      expect(result.data).toHaveProperty('active');
      expect(result.data).toHaveProperty('banned');
      expect(result.data).toHaveProperty('byRole');
      expect(result.data).toHaveProperty('byProvider');
      expect(result.data).toHaveProperty('recentSignups');
    });
  });
});
