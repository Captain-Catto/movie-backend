import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { createMockConfigService } from '@/__tests__/utils/typeorm-mocks';

// Mock user entity
vi.mock('../entities/user.entity', () => ({
  User: class User {},
}));

const { JwtStrategy } = await import('./jwt.strategy');

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: ReturnType<typeof createMockConfigService>;
  let authService: any;

  beforeEach(() => {
    // Mock ConfigService
    configService = createMockConfigService();

    // Mock AuthService
    authService = {
      validateUser: vi.fn(),
    };

    strategy = new JwtStrategy(configService as any, authService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should validate user with valid payload', async () => {
    const payload = {
      sub: 1,
      email: 'test@example.com',
      role: 'user',
    };

    const user = {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
    };

    authService.validateUser.mockResolvedValue(user);

    const result = await strategy.validate(payload);

    expect(result).toEqual(user);
    expect(authService.validateUser).toHaveBeenCalledWith(1);
  });

  it('should throw UnauthorizedException if user not found', async () => {
    const payload = {
      sub: 999,
      email: 'nonexistent@example.com',
    };

    authService.validateUser.mockResolvedValue(null);

    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    expect(authService.validateUser).toHaveBeenCalledWith(999);
  });

  it('should validate admin user', async () => {
    const payload = {
      sub: 2,
      email: 'admin@example.com',
      role: 'admin',
    };

    const user = {
      id: 2,
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
    };

    authService.validateUser.mockResolvedValue(user);

    const result = await strategy.validate(payload);

    expect(result).toEqual(user);
    expect(result.role).toBe('admin');
  });

  it('should validate super_admin user', async () => {
    const payload = {
      sub: 3,
      email: 'superadmin@example.com',
      role: 'super_admin',
    };

    const user = {
      id: 3,
      email: 'superadmin@example.com',
      name: 'Super Admin',
      role: 'super_admin',
    };

    authService.validateUser.mockResolvedValue(user);

    const result = await strategy.validate(payload);

    expect(result).toEqual(user);
    expect(result.role).toBe('super_admin');
  });

  it('should validate viewer user', async () => {
    const payload = {
      sub: 4,
      email: 'viewer@example.com',
      role: 'viewer',
    };

    const user = {
      id: 4,
      email: 'viewer@example.com',
      name: 'Viewer User',
      role: 'viewer',
    };

    authService.validateUser.mockResolvedValue(user);

    const result = await strategy.validate(payload);

    expect(result).toEqual(user);
    expect(result.role).toBe('viewer');
  });

  it('should extract userId from payload.sub', async () => {
    const payload = {
      sub: 123,
      email: 'test@example.com',
    };

    const user = {
      id: 123,
      email: 'test@example.com',
      role: 'user',
    };

    authService.validateUser.mockResolvedValue(user);

    await strategy.validate(payload);

    // Verify that the userId is extracted from payload.sub
    expect(authService.validateUser).toHaveBeenCalledWith(123);
  });
});
