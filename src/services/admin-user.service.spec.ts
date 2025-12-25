import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';

// Mock entities
vi.mock('../entities', () => ({
  User: class User {},
  UserRole: {
    USER: 'user',
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin',
    VIEWER: 'viewer',
  },
  UserActivity: class UserActivity {},
  ActivityType: {
    LOGIN: 'login',
    SEARCH: 'search',
    VIEW_CONTENT: 'view_content',
    FAVORITE_ADD: 'favorite_add',
  },
  Movie: class Movie {},
  TvShow: class TvShow {},
  Favorite: class Favorite {},
  Comment: class Comment {},
}));

const { AdminUserService } = await import('./admin-user.service');
const { UserRole, ActivityType } = await import('../entities');

describe('AdminUserService', () => {
  let service: AdminUserService;
  let userRepository: any;
  let userActivityRepository: any;

  beforeEach(() => {
    // Mock user repository
    userRepository = {
      createQueryBuilder: vi.fn(),
      findOne: vi.fn(),
      save: vi.fn(),
      count: vi.fn(),
    };

    // Mock user activity repository
    userActivityRepository = {
      find: vi.fn(),
      findOne: vi.fn(),
      count: vi.fn(),
    };

    service = new AdminUserService(userRepository, userActivityRepository);
  });

  describe('getUsersList', () => {
    it('should get users list with default pagination', async () => {
      const mockUsers = [
        { id: 1, email: 'user1@test.com', name: 'User 1', password: 'hashed', role: UserRole.USER },
        { id: 2, email: 'user2@test.com', name: 'User 2', password: 'hashed', role: UserRole.ADMIN },
      ];

      const mockQueryBuilder = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([mockUsers, 2]),
      };

      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getUsersList({ page: 1, limit: 20 });

      expect(result).toEqual({
        items: [
          { id: 1, email: 'user1@test.com', name: 'User 1', role: UserRole.USER },
          { id: 2, email: 'user2@test.com', name: 'User 2', role: UserRole.ADMIN },
        ],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
    });

    it('should filter by status: active', async () => {
      const mockQueryBuilder = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
      };

      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getUsersList({ status: 'active' });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('user.isActive = :active', { active: true });
    });

    it('should filter by status: banned', async () => {
      const mockQueryBuilder = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
      };

      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getUsersList({ status: 'banned' });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('user.isActive = :active', { active: false });
    });

    it('should filter by role', async () => {
      const mockQueryBuilder = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
      };

      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getUsersList({ role: UserRole.ADMIN });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.role = :role', { role: UserRole.ADMIN });
    });

    it('should search by email or name', async () => {
      const mockQueryBuilder = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
      };

      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getUsersList({ search: 'john' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER(user.email) LIKE LOWER(:search) OR LOWER(user.name) LIKE LOWER(:search)',
        { search: '%john%' }
      );
    });

    it('should handle pagination correctly', async () => {
      const mockQueryBuilder = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([[], 50]),
      };

      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getUsersList({ page: 3, limit: 10 });

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(20); // (3-1) * 10
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(result.totalPages).toBe(5); // Math.ceil(50 / 10)
    });
  });

  describe('getUserDetails', () => {
    it('should get user details with activities and stats', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed',
        favorites: [],
      };

      const mockActivities = [
        { id: 1, userId: 1, activityType: ActivityType.LOGIN, createdAt: new Date() },
        { id: 2, userId: 1, activityType: ActivityType.VIEW_CONTENT, createdAt: new Date() },
      ];

      userRepository.findOne.mockResolvedValue(mockUser);
      userActivityRepository.find.mockResolvedValue(mockActivities);
      userActivityRepository.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(5) // logins
        .mockResolvedValueOnce(2) // searches
        .mockResolvedValueOnce(3) // views
        .mockResolvedValueOnce(1); // favorites
      userActivityRepository.findOne.mockResolvedValue({
        createdAt: new Date('2024-01-01'),
      });

      const result = await service.getUserDetails(1);

      expect(result.user).toEqual({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        favorites: [],
      });
      expect(result.activities).toHaveLength(2);
      expect(result.stats).toEqual({
        total: 10,
        logins: 5,
        searches: 2,
        views: 3,
        favorites: 1,
        lastLogin: expect.any(Date),
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserDetails(999)).rejects.toThrow(NotFoundException);
      await expect(service.getUserDetails(999)).rejects.toThrow('User with ID 999 not found');
    });

    it('should handle missing activity stats gracefully', async () => {
      const mockUser = { id: 1, email: 'test@example.com', password: 'hashed' };

      userRepository.findOne.mockResolvedValue(mockUser);
      userActivityRepository.find.mockResolvedValue([]);
      userActivityRepository.count.mockRejectedValue(new Error('DB error'));
      userActivityRepository.findOne.mockResolvedValue(null);

      const result = await service.getUserDetails(1);

      expect(result.stats).toEqual({
        total: 0,
        logins: 0,
        searches: 0,
        views: 0,
        favorites: 0,
        lastLogin: null,
      });
    });
  });

  describe('banUser', () => {
    it('should ban user successfully', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed',
        isActive: true,
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockImplementation((user) => Promise.resolve(user));

      const dto = {
        userId: 1,
        reason: 'Violation of terms',
        bannedBy: 2,
      };

      const result = await service.banUser(dto);

      expect(result).toMatchObject({
        id: 1,
        isActive: false,
        bannedReason: 'Violation of terms',
        bannedBy: 2,
        bannedAt: expect.any(Date),
      });
      expect(result).not.toHaveProperty('password');
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const dto = { userId: 999, reason: 'Test', bannedBy: 1 };

      await expect(service.banUser(dto)).rejects.toThrow(NotFoundException);
      await expect(service.banUser(dto)).rejects.toThrow('User with ID 999 not found');
    });
  });

  describe('unbanUser', () => {
    it('should unban user successfully', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed',
        isActive: false,
        bannedReason: 'Previous violation',
        bannedBy: 2,
        bannedAt: new Date(),
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockImplementation((user) => Promise.resolve(user));

      const result = await service.unbanUser(1);

      expect(result).toMatchObject({
        id: 1,
        isActive: true,
        bannedReason: null,
        bannedBy: null,
        bannedAt: null,
      });
      expect(result).not.toHaveProperty('password');
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.unbanUser(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUserRole', () => {
    it('should update user role successfully', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed',
        role: UserRole.USER,
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockImplementation((user) => Promise.resolve(user));

      const result = await service.updateUserRole(1, UserRole.ADMIN);

      expect(result.role).toBe(UserRole.ADMIN);
      expect(result).not.toHaveProperty('password');
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.updateUserRole(999, UserRole.ADMIN)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUserProfile', () => {
    it('should update user name', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Old Name',
        password: 'hashed',
        role: UserRole.USER,
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockImplementation((user) => Promise.resolve(user));

      const result = await service.updateUserProfile(1, { name: 'New Name' });

      expect(result.name).toBe('New Name');
      expect(result).not.toHaveProperty('password');
    });

    it('should update user role', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed',
        role: UserRole.USER,
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockImplementation((user) => Promise.resolve(user));

      const result = await service.updateUserProfile(1, { role: UserRole.VIEWER });

      expect(result.role).toBe(UserRole.VIEWER);
    });

    it('should update user active status', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed',
        isActive: false,
        bannedAt: new Date(),
        bannedBy: 2,
        bannedReason: 'Test',
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockImplementation((user) => Promise.resolve(user));

      const result = await service.updateUserProfile(1, { isActive: true });

      expect(result.isActive).toBe(true);
      expect(result.bannedAt).toBeNull();
      expect(result.bannedBy).toBeNull();
      expect(result.bannedReason).toBeNull();
    });

    it('should update user password with hashing', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'old_hashed',
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockImplementation((user) => Promise.resolve(user));

      await service.updateUserProfile(1, { password: 'newpassword123' });

      const savedUser = userRepository.save.mock.calls[0][0];
      expect(savedUser.password).not.toBe('newpassword123');
      expect(savedUser.password).toMatch(/^\$2[ayb]\$.{56}$/); // bcrypt hash pattern
    });

    it('should not update password if empty string', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'old_hashed',
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockImplementation((user) => Promise.resolve(user));

      await service.updateUserProfile(1, { password: '  ' });

      const savedUser = userRepository.save.mock.calls[0][0];
      expect(savedUser.password).toBe('old_hashed');
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.updateUserProfile(999, { name: 'Test' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserStats', () => {
    it('should get user statistics', async () => {
      userRepository.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(95) // active
        .mockResolvedValueOnce(5) // banned
        .mockResolvedValueOnce(10) // admin
        .mockResolvedValueOnce(2) // super_admin
        .mockResolvedValueOnce(85) // regular users
        .mockResolvedValueOnce(15) // recent signups
        .mockResolvedValueOnce(60) // email users
        .mockResolvedValueOnce(40); // google users

      const result = await service.getUserStats();

      expect(result).toEqual({
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
      });
    });

    it('should handle errors gracefully', async () => {
      userRepository.count.mockRejectedValue(new Error('Database error'));

      await expect(service.getUserStats()).rejects.toThrow('Database error');
    });
  });
});
