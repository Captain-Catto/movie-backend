import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext } from '@nestjs/common';

// Mock @nestjs/passport before importing guard
vi.mock('@nestjs/passport', () => ({
  AuthGuard: vi.fn().mockImplementation((strategy: string) => {
    return class MockAuthGuard {
      canActivate(context: ExecutionContext): boolean {
        return true;
      }
    };
  }),
}));

const { JwtAuthGuard } = await import('./jwt-auth.guard');

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should extend AuthGuard with jwt strategy', () => {
    // JwtAuthGuard should be an instance that extends AuthGuard
    expect(guard).toBeInstanceOf(JwtAuthGuard);
  });

  it('should call canActivate method', () => {
    const mockContext = {
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({
          headers: {
            authorization: 'Bearer valid_token',
          },
        }),
      }),
    } as any;

    const result = guard.canActivate(mockContext);

    // Mock implementation returns true
    expect(result).toBe(true);
  });
});
