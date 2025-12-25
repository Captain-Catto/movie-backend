import { ExecutionContext } from '@nestjs/common';

export function createMockExecutionContext(mockRequest: any): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
      getResponse: () => ({}),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as ExecutionContext;
}

export function createMockUser(overrides = {}) {
  return {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    role: 'user',
    emailVerified: true,
    banned: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockMovie(overrides = {}) {
  return {
    id: 1,
    tmdbId: 12345,
    title: 'Test Movie',
    originalTitle: 'Test Movie',
    overview: 'A test movie',
    releaseDate: new Date('2024-01-01'),
    contentType: 'movie',
    voteAverage: 8.5,
    voteCount: 1000,
    popularity: 100,
    adult: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
