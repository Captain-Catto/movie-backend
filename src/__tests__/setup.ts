import 'reflect-metadata';
import { vi } from 'vitest';

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.DATABASE_HOST = 'localhost';
process.env.DATABASE_PORT = '5432';
process.env.DATABASE_NAME = 'test_db';

// Global test timeout
vi.setConfig({ testTimeout: 10000 });

// Clear all mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});
