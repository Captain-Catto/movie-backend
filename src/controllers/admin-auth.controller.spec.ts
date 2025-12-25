import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { createMockRepository } from '@/__tests__/utils/typeorm-mocks';

// Mock UserRole enum to avoid importing entity
enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
  VIEWER = 'viewer',
}

// Mock the User entity module before importing controller
vi.mock('../entities/user.entity', () => ({
  User: class User {},
  UserRole: {
    USER: 'user',
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin',
    VIEWER: 'viewer',
  },
}));

// Now import controller after mocking
const { AdminAuthController } = await import('./admin-auth.controller');

describe('AdminAuthController', () => {
  let controller: AdminAuthController;
  let authService: any;
  let userRepository: ReturnType<typeof createMockRepository>;

  beforeEach(() => {
    // Mock AuthService
    authService = {
      login: vi.fn(),
    };

    // Mock UserRepository
    userRepository = createMockRepository();

    controller = new AdminAuthController(authService, userRepository as any);
  });

  describe('adminLogin', () => {
    it('should login admin user successfully', async () => {
      const loginDto = {
        email: 'admin@example.com',
        password: 'admin123',
      };

      const loginResult = {
        user: {
          id: 1,
          email: 'admin@example.com',
          name: 'Admin User',
          role: UserRole.ADMIN,
        },
        token: 'jwt_token_123',
        refreshToken: 'refresh_token_123',
      };

      const mockReq = {
        headers: {
          'user-agent': 'Mozilla/5.0',
        },
        ip: '192.168.1.1',
      };

      authService.login.mockResolvedValue(loginResult);

      const result = await controller.adminLogin(loginDto, mockReq);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Admin login successful');
      expect(result.data).toEqual(loginResult);
      expect(authService.login).toHaveBeenCalledWith(loginDto, {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });
    });

    it('should login super admin successfully', async () => {
      const loginDto = {
        email: 'superadmin@example.com',
        password: 'superadmin123',
      };

      const loginResult = {
        user: {
          id: 2,
          email: 'superadmin@example.com',
          name: 'Super Admin',
          role: UserRole.SUPER_ADMIN,
        },
        token: 'jwt_token_456',
        refreshToken: 'refresh_token_456',
      };

      const mockReq = {
        headers: {},
        ip: '127.0.0.1',
      };

      authService.login.mockResolvedValue(loginResult);

      const result = await controller.adminLogin(loginDto, mockReq);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Admin login successful');
    });

    it('should login viewer successfully', async () => {
      const loginDto = {
        email: 'viewer@example.com',
        password: 'viewer123',
      };

      const loginResult = {
        user: {
          id: 3,
          email: 'viewer@example.com',
          name: 'Viewer User',
          role: UserRole.VIEWER,
        },
        token: 'jwt_token_789',
        refreshToken: 'refresh_token_789',
      };

      const mockReq = {
        headers: {},
      };

      authService.login.mockResolvedValue(loginResult);

      const result = await controller.adminLogin(loginDto, mockReq);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Admin login successful');
    });

    it('should reject regular user login', async () => {
      const loginDto = {
        email: 'user@example.com',
        password: 'user123',
      };

      const loginResult = {
        user: {
          id: 4,
          email: 'user@example.com',
          name: 'Regular User',
          role: UserRole.USER,
        },
        token: 'jwt_token_user',
        refreshToken: 'refresh_token_user',
      };

      const mockReq = {
        headers: {},
      };

      authService.login.mockResolvedValue(loginResult);

      const result = await controller.adminLogin(loginDto, mockReq);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Access denied');
    });

    it('should handle login errors', async () => {
      const loginDto = {
        email: 'admin@example.com',
        password: 'wrongpassword',
      };

      const mockReq = {
        headers: {},
      };

      authService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials')
      );

      const result = await controller.adminLogin(loginDto, mockReq);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid credentials');
      expect(result.error).toBe('Invalid credentials');
    });

    it('should extract IP from x-forwarded-for header', async () => {
      const loginDto = {
        email: 'admin@example.com',
        password: 'admin123',
      };

      const loginResult = {
        user: {
          id: 1,
          email: 'admin@example.com',
          role: UserRole.ADMIN,
        },
        token: 'jwt_token',
        refreshToken: 'refresh_token',
      };

      const mockReq = {
        headers: {
          'x-forwarded-for': '203.0.113.1, 198.51.100.1',
          'user-agent': 'Mozilla/5.0',
        },
      };

      authService.login.mockResolvedValue(loginResult);

      await controller.adminLogin(loginDto, mockReq);

      expect(authService.login).toHaveBeenCalledWith(loginDto, {
        ipAddress: '203.0.113.1',
        userAgent: 'Mozilla/5.0',
      });
    });
  });

  describe('promoteToAdmin', () => {
    beforeEach(() => {
      // Set environment variable for tests
      process.env.ADMIN_PROMOTION_SECRET = 'test-secret-key';
    });

    it('should promote user to admin with correct secret', async () => {
      const promoteDto = {
        email: 'user@example.com',
        secret: 'test-secret-key',
      };

      const user = {
        id: 1,
        email: 'user@example.com',
        name: 'Regular User',
        role: UserRole.USER,
      };

      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockResolvedValue({ ...user, role: UserRole.ADMIN });

      const result = await controller.promoteToAdmin(promoteDto);

      expect(result.success).toBe(true);
      expect(result.message).toContain('promoted to admin successfully');
      expect(result.data).toEqual({
        id: 1,
        email: 'user@example.com',
        role: UserRole.ADMIN,
      });
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
      });
    });

    it('should reject promotion with invalid secret', async () => {
      const promoteDto = {
        email: 'user@example.com',
        secret: 'wrong-secret',
      };

      const result = await controller.promoteToAdmin(promoteDto);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid secret key');
      expect(result.data).toBeNull();
      expect(userRepository.findOne).not.toHaveBeenCalled();
    });

    it('should return error if user not found', async () => {
      const promoteDto = {
        email: 'nonexistent@example.com',
        secret: 'test-secret-key',
      };

      userRepository.findOne.mockResolvedValue(null);

      const result = await controller.promoteToAdmin(promoteDto);

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
      expect(result.data).toBeNull();
    });

    it('should handle database errors', async () => {
      const promoteDto = {
        email: 'user@example.com',
        secret: 'test-secret-key',
      };

      const user = {
        id: 1,
        email: 'user@example.com',
        role: UserRole.USER,
      };

      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockRejectedValue(new Error('Database error'));

      const result = await controller.promoteToAdmin(promoteDto);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to promote user');
      expect(result.error).toBe('Database error');
    });

    it('should use default secret if env variable not set', async () => {
      delete process.env.ADMIN_PROMOTION_SECRET;

      const promoteDto = {
        email: 'user@example.com',
        secret: 'promote-admin-2024',
      };

      const user = {
        id: 1,
        email: 'user@example.com',
        role: UserRole.USER,
      };

      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockResolvedValue({ ...user, role: UserRole.ADMIN });

      const result = await controller.promoteToAdmin(promoteDto);

      expect(result.success).toBe(true);
    });
  });
});
