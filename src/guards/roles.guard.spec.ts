import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
import { createMockExecutionContext } from '@/__tests__/utils/test-helpers';

// Mock user entity
vi.mock('../entities/user.entity', () => ({
  UserRole: {
    USER: 'user',
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin',
    VIEWER: 'viewer',
  },
}));

const { RolesGuard } = await import('./roles.guard');

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access when no roles are required', () => {
    const mockRequest = {
      user: { id: 1, role: 'user' },
    };
    const context = createMockExecutionContext(mockRequest);

    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should allow access when user has required role', () => {
    const mockRequest = {
      user: { id: 1, email: 'admin@example.com', role: 'admin' },
    };
    const context = createMockExecutionContext(mockRequest);

    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'super_admin']);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should deny access when user does not have required role', () => {
    const mockRequest = {
      user: { id: 1, email: 'user@example.com', role: 'user' },
    };
    const context = createMockExecutionContext(mockRequest);

    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'super_admin']);

    const result = guard.canActivate(context);

    expect(result).toBe(false);
  });

  it('should deny access when no user in request', () => {
    const mockRequest = {};
    const context = createMockExecutionContext(mockRequest);

    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

    const result = guard.canActivate(context);

    expect(result).toBe(false);
  });

  it('should allow super_admin to access admin routes', () => {
    const mockRequest = {
      user: { id: 1, email: 'superadmin@example.com', role: 'super_admin' },
    };
    const context = createMockExecutionContext(mockRequest);

    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'super_admin']);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should allow viewer to access viewer routes', () => {
    const mockRequest = {
      user: { id: 1, email: 'viewer@example.com', role: 'viewer' },
    };
    const context = createMockExecutionContext(mockRequest);

    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'super_admin', 'viewer']);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should check multiple roles correctly', () => {
    const mockRequest = {
      user: { id: 1, email: 'user@example.com', role: 'user' },
    };
    const context = createMockExecutionContext(mockRequest);

    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['user', 'admin']);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });
});
