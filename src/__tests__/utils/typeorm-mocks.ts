import { vi } from 'vitest';

export function createMockRepository<T>() {
  return {
    find: vi.fn(),
    findOne: vi.fn(),
    findOneBy: vi.fn(),
    findByUserId: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    remove: vi.fn(),
    count: vi.fn(),
    createQueryBuilder: createMockQueryBuilder<T>(),
  };
}

export function createMockQueryBuilder<T>() {
  const qb = {
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    orWhere: vi.fn().mockReturnThis(),
    leftJoinAndSelect: vi.fn().mockReturnThis(),
    innerJoinAndSelect: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    addOrderBy: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    take: vi.fn().mockReturnThis(),
    getOne: vi.fn(),
    getMany: vi.fn(),
    getManyAndCount: vi.fn(),
    getCount: vi.fn(),
    execute: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    into: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
  };
  return () => qb;
}

export function createMockJwtService() {
  return {
    sign: vi.fn().mockReturnValue('mock-jwt-token'),
    verify: vi.fn().mockReturnValue({ userId: 1, role: 'user' }),
    decode: vi.fn(),
  };
}

export function createMockConfigService() {
  return {
    get: vi.fn((key: string) => {
      const config: Record<string, any> = {
        JWT_SECRET: 'test-secret',
        JWT_EXPIRES_IN: '1h',
        TMDB_API_KEY: 'test-tmdb-key',
      };
      return config[key];
    }),
  };
}
