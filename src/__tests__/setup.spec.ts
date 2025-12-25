import { describe, it, expect } from 'vitest';
import { createMockRepository, createMockJwtService } from './utils/typeorm-mocks';
import { createMockUser, createMockMovie } from './utils/test-helpers';

describe('Vitest Setup Smoke Test', () => {
  it('should load test environment correctly', () => {
    expect(process.env.JWT_SECRET).toBe('test-jwt-secret');
    expect(process.env.DATABASE_NAME).toBe('test_db');
  });

  it('should create mock repository with all methods', () => {
    const mockRepo = createMockRepository();
    expect(mockRepo.find).toBeDefined();
    expect(mockRepo.save).toBeDefined();
    expect(mockRepo.createQueryBuilder).toBeDefined();
  });

  it('should create mock JWT service', () => {
    const mockJwt = createMockJwtService();
    expect(mockJwt.sign()).toBe('mock-jwt-token');
    expect(mockJwt.verify({})).toEqual({ userId: 1, role: 'user' });
  });

  it('should create mock user with defaults', () => {
    const user = createMockUser();
    expect(user.id).toBe(1);
    expect(user.username).toBe('testuser');
    expect(user.email).toBe('test@example.com');
  });

  it('should create mock user with overrides', () => {
    const user = createMockUser({ username: 'customuser', id: 99 });
    expect(user.id).toBe(99);
    expect(user.username).toBe('customuser');
  });

  it('should create mock movie with defaults', () => {
    const movie = createMockMovie();
    expect(movie.id).toBe(1);
    expect(movie.title).toBe('Test Movie');
    expect(movie.tmdbId).toBe(12345);
  });
});
