import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

// Mock entities
vi.mock('../entities/viewer-audit-log.entity', () => ({
  ViewerAuditLog: class ViewerAuditLog {},
}));

vi.mock('../entities/user.entity', () => ({
  UserRole: {
    USER: 'user',
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin',
    VIEWER: 'viewer',
  },
}));

const { ViewerReadOnlyInterceptor } = await import('./viewer-read-only.interceptor');
const { UserRole } = await import('../entities/user.entity');

describe('ViewerReadOnlyInterceptor', () => {
  let interceptor: ViewerReadOnlyInterceptor;
  let auditLogRepository: any;
  let mockCallHandler: CallHandler;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    // Mock audit log repository
    auditLogRepository = {
      create: vi.fn((data) => data),
      save: vi.fn((data) => Promise.resolve(data)),
    };

    interceptor = new ViewerReadOnlyInterceptor(auditLogRepository);

    // Mock CallHandler
    mockCallHandler = {
      handle: vi.fn(() => of({ success: true, data: 'real data' })),
    };
  });

  const createMockContext = (method: string, url: string, user: any, body = {}): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          url,
          user,
          body,
          query: {},
          headers: {
            'user-agent': 'Test Browser',
            'x-forwarded-for': '192.168.1.1',
          },
          ip: '192.168.1.1',
        }),
      }),
    } as any;
  };

  describe('Non-VIEWER users', () => {
    it('should allow USER role to make any request', async () => {
      const user = { id: 1, role: UserRole.USER };
      mockContext = createMockContext('POST', '/admin/users/ban', user);

      const result = await interceptor.intercept(mockContext, mockCallHandler);

      // Should call next.handle()
      expect(mockCallHandler.handle).toHaveBeenCalled();
      const value = await new Promise((resolve) => {
        result.subscribe(resolve);
      });
      expect(value).toEqual({ success: true, data: 'real data' });
    });

    it('should allow ADMIN role to make any request', async () => {
      const user = { id: 2, role: UserRole.ADMIN };
      mockContext = createMockContext('DELETE', '/admin/comments/5', user);

      const result = await interceptor.intercept(mockContext, mockCallHandler);

      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should allow SUPER_ADMIN role to make any request', async () => {
      const user = { id: 3, role: UserRole.SUPER_ADMIN };
      mockContext = createMockContext('PUT', '/admin/users/1/role', user);

      const result = await interceptor.intercept(mockContext, mockCallHandler);

      expect(mockCallHandler.handle).toHaveBeenCalled();
    });
  });

  describe('VIEWER role - GET requests', () => {
    it('should allow VIEWER to make GET requests', async () => {
      const user = { id: 4, role: UserRole.VIEWER };
      mockContext = createMockContext('GET', '/admin/users/list', user);

      const result = await interceptor.intercept(mockContext, mockCallHandler);

      // Should call next.handle() for GET requests
      expect(mockCallHandler.handle).toHaveBeenCalled();
      const value = await new Promise((resolve) => {
        result.subscribe(resolve);
      });
      expect(value).toEqual({ success: true, data: 'real data' });
    });

    it('should not log audit for VIEWER GET requests', async () => {
      const user = { id: 4, role: UserRole.VIEWER };
      mockContext = createMockContext('GET', '/admin/users/1', user);

      await interceptor.intercept(mockContext, mockCallHandler);

      expect(auditLogRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('VIEWER role - Write operations', () => {
    it('should block VIEWER POST requests and return fake response', async () => {
      const user = { id: 4, role: UserRole.VIEWER };
      const body = { userId: 10, reason: 'spam' };
      mockContext = createMockContext('POST', '/admin/users/ban', user, body);

      const result = await interceptor.intercept(mockContext, mockCallHandler);

      // Should NOT call next.handle()
      expect(mockCallHandler.handle).not.toHaveBeenCalled();

      // Should return fake success response
      const value = await new Promise((resolve) => {
        result.subscribe(resolve);
      });
      expect(value).toEqual({
        success: true,
        message: 'User banned successfully',
        data: expect.objectContaining({
          userId: 10,
          reason: 'spam',
          id: expect.any(Number),
        }),
      });
    });

    it('should block VIEWER PUT requests', async () => {
      const user = { id: 4, role: UserRole.VIEWER };
      const body = { role: 'admin' };
      mockContext = createMockContext('PUT', '/admin/users/1/role', user, body);

      const result = await interceptor.intercept(mockContext, mockCallHandler);

      expect(mockCallHandler.handle).not.toHaveBeenCalled();

      const value = await new Promise((resolve) => {
        result.subscribe(resolve);
      });
      expect(value.success).toBe(true);
      expect(value.message).toBe('User role updated successfully');
    });

    it('should block VIEWER PATCH requests', async () => {
      const user = { id: 4, role: UserRole.VIEWER };
      const body = { name: 'Updated' };
      mockContext = createMockContext('PATCH', '/admin/settings', user, body);

      const result = await interceptor.intercept(mockContext, mockCallHandler);

      expect(mockCallHandler.handle).not.toHaveBeenCalled();

      const value = await new Promise((resolve) => {
        result.subscribe(resolve);
      });
      expect(value.success).toBe(true);
      expect(value.message).toBe('Settings updated successfully');
    });

    it('should block VIEWER DELETE requests', async () => {
      const user = { id: 4, role: UserRole.VIEWER };
      mockContext = createMockContext('DELETE', '/admin/comments/123', user);

      const result = await interceptor.intercept(mockContext, mockCallHandler);

      expect(mockCallHandler.handle).not.toHaveBeenCalled();

      const value = await new Promise((resolve) => {
        result.subscribe(resolve);
      });
      expect(value.success).toBe(true);
      expect(value.message).toBe('Comment deleted successfully');
      expect(value.data).toBeNull();
    });
  });

  describe('Audit logging', () => {
    it('should log VIEWER write attempts to audit log', async () => {
      const user = { id: 4, role: UserRole.VIEWER };
      const body = { userId: 10, reason: 'spam' };
      mockContext = createMockContext('POST', '/admin/users/ban', user, body);

      await interceptor.intercept(mockContext, mockCallHandler);

      expect(auditLogRepository.create).toHaveBeenCalledWith({
        userId: 4,
        endpoint: '/admin/users/ban',
        httpMethod: 'POST',
        payload: body,
        queryParams: {},
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser',
        attemptedAction: 'Ban user #10',
      });
      expect(auditLogRepository.save).toHaveBeenCalled();
    });

    it('should log unban attempts', async () => {
      const user = { id: 4, role: UserRole.VIEWER };
      const body = { userId: 5 };
      mockContext = createMockContext('POST', '/admin/users/unban', user, body);

      await interceptor.intercept(mockContext, mockCallHandler);

      const createCall = auditLogRepository.create.mock.calls[0][0];
      expect(createCall.attemptedAction).toBe('Unban user');
    });

    it('should log role update attempts', async () => {
      const user = { id: 4, role: UserRole.VIEWER };
      const body = { role: 'admin' };
      mockContext = createMockContext('PUT', '/admin/users/1/role', user, body);

      await interceptor.intercept(mockContext, mockCallHandler);

      const createCall = auditLogRepository.create.mock.calls[0][0];
      expect(createCall.attemptedAction).toBe('Update user role to admin');
    });

    it('should log content block attempts', async () => {
      const user = { id: 4, role: UserRole.VIEWER };
      const body = { contentId: '12345' };
      mockContext = createMockContext('POST', '/admin/content/block', user, body);

      await interceptor.intercept(mockContext, mockCallHandler);

      const createCall = auditLogRepository.create.mock.calls[0][0];
      expect(createCall.attemptedAction).toBe('Block content 12345');
    });

    it('should log notification broadcast attempts', async () => {
      const user = { id: 4, role: UserRole.VIEWER };
      const body = { title: 'System Maintenance' };
      mockContext = createMockContext('POST', '/admin/notifications/broadcast', user, body);

      await interceptor.intercept(mockContext, mockCallHandler);

      const createCall = auditLogRepository.create.mock.calls[0][0];
      expect(createCall.attemptedAction).toBe('Broadcast notification: System Maintenance');
    });

    it('should handle audit log save errors gracefully', async () => {
      const user = { id: 4, role: UserRole.VIEWER };
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      auditLogRepository.save.mockRejectedValue(new Error('Database error'));

      mockContext = createMockContext('POST', '/admin/users/ban', user);

      // Should still return fake response even if logging fails
      const result = await interceptor.intercept(mockContext, mockCallHandler);
      const value = await new Promise((resolve) => {
        result.subscribe(resolve);
      });

      expect(value.success).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Fake response generation', () => {
    it('should generate fake response with body data', async () => {
      const user = { id: 4, role: UserRole.VIEWER };
      const body = { name: 'Test', value: 123 };
      mockContext = createMockContext('POST', '/admin/test', user, body);

      const result = await interceptor.intercept(mockContext, mockCallHandler);
      const value = await new Promise((resolve) => {
        result.subscribe(resolve);
      });

      expect(value.data).toMatchObject({
        name: 'Test',
        value: 123,
        id: expect.any(Number),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('should generate null data for DELETE requests', async () => {
      const user = { id: 4, role: UserRole.VIEWER };
      mockContext = createMockContext('DELETE', '/admin/notifications/5', user);

      const result = await interceptor.intercept(mockContext, mockCallHandler);
      const value = await new Promise((resolve) => {
        result.subscribe(resolve);
      });

      expect(value.data).toBeNull();
      expect(value.message).toBe('Notification deleted successfully');
    });

    it('should generate appropriate message for different endpoints', async () => {
      const testCases = [
        { method: 'POST', url: '/admin/content/unblock', expected: 'Content unblocked successfully' },
        { method: 'POST', url: '/admin/sync', expected: 'Data sync started successfully' },
        { method: 'POST', url: '/admin/seo', expected: 'SEO metadata created successfully' },
        { method: 'PUT', url: '/admin/seo/1', expected: 'SEO metadata updated successfully' },
        { method: 'DELETE', url: '/admin/seo/1', expected: 'SEO metadata deleted successfully' },
        { method: 'PUT', url: '/admin/comments/5/hide', expected: 'Comment hidden successfully' },
      ];

      for (const testCase of testCases) {
        const user = { id: 4, role: UserRole.VIEWER };
        mockContext = createMockContext(testCase.method, testCase.url, user);

        const result = await interceptor.intercept(mockContext, mockCallHandler);
        const value = await new Promise((resolve) => {
          result.subscribe(resolve);
        });

        expect(value.message).toBe(testCase.expected);
      }
    });
  });

  describe('IP extraction', () => {
    it('should extract IP from x-forwarded-for header', async () => {
      const user = { id: 4, role: UserRole.VIEWER };
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            url: '/admin/test',
            user,
            body: {},
            query: {},
            headers: {
              'x-forwarded-for': '10.0.0.1, 192.168.1.1',
              'user-agent': 'Test',
            },
          }),
        }),
      } as any;

      await interceptor.intercept(context, mockCallHandler);

      const createCall = auditLogRepository.create.mock.calls[0][0];
      expect(createCall.ipAddress).toBe('10.0.0.1');
    });

    it('should fallback to request.ip if no x-forwarded-for', async () => {
      const user = { id: 4, role: UserRole.VIEWER };
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            url: '/admin/test',
            user,
            body: {},
            query: {},
            headers: { 'user-agent': 'Test' },
            ip: '127.0.0.1',
          }),
        }),
      } as any;

      await interceptor.intercept(context, mockCallHandler);

      const createCall = auditLogRepository.create.mock.calls[0][0];
      expect(createCall.ipAddress).toBe('127.0.0.1');
    });
  });
});
