import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FavoriteService } from './favorite.service';
import { createMockRepository } from '@/__tests__/utils/typeorm-mocks';

describe('FavoriteService', () => {
  let service: FavoriteService;
  let favoriteRepository: any;
  let analyticsRealtime: any;

  beforeEach(() => {
    // Mock FavoriteRepository
    favoriteRepository = {
      findByUserId: vi.fn(),
      findByUserAndContent: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      findIdsByUserId: vi.fn(),
      checkExists: vi.fn(),
    };

    // Mock AdminAnalyticsRealtimeService
    analyticsRealtime = {
      trackFavoriteDelta: vi.fn().mockResolvedValue(undefined),
    };

    service = new FavoriteService(favoriteRepository, analyticsRealtime);
  });

  describe('getUserFavorites', () => {
    it('should return user favorites with pagination', async () => {
      const userId = 1;
      const options = { page: 1, limit: 10 };

      const mockResult = {
        data: [
          { id: 1, contentId: '12345', contentType: 'movie', userId: 1 },
          { id: 2, contentId: '67890', contentType: 'tv', userId: 1 },
        ],
        total: 2,
        page: 1,
        totalPages: 1,
        hasMore: false,
      };

      favoriteRepository.findByUserId.mockResolvedValue(mockResult);

      const result = await service.getUserFavorites(userId, options);

      expect(result).toEqual({
        favorites: mockResult.data,
        total: 2,
        page: 1,
        totalPages: 1,
        hasMore: false,
      });
      expect(favoriteRepository.findByUserId).toHaveBeenCalledWith(userId, options);
    });

    it('should handle empty favorites list', async () => {
      const userId = 1;
      const options = { page: 1, limit: 10 };

      const mockResult = {
        data: [],
        total: 0,
        page: 1,
        totalPages: 0,
        hasMore: false,
      };

      favoriteRepository.findByUserId.mockResolvedValue(mockResult);

      const result = await service.getUserFavorites(userId, options);

      expect(result.favorites).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle pagination correctly', async () => {
      const userId = 1;
      const options = { page: 2, limit: 5 };

      const mockResult = {
        data: [
          { id: 6, contentId: '11111', contentType: 'movie', userId: 1 },
        ],
        total: 10,
        page: 2,
        totalPages: 2,
        hasMore: false,
      };

      favoriteRepository.findByUserId.mockResolvedValue(mockResult);

      const result = await service.getUserFavorites(userId, options);

      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(2);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('addToFavorites', () => {
    it('should add movie to favorites successfully', async () => {
      const userId = 1;
      const contentId = '12345';
      const contentType = 'movie';

      const createdFavorite = {
        id: 1,
        userId,
        contentId,
        contentType,
        createdAt: new Date(),
      };

      favoriteRepository.findByUserAndContent.mockResolvedValue(null);
      favoriteRepository.create.mockResolvedValue(createdFavorite);

      const result = await service.addToFavorites(userId, contentId, contentType);

      expect(result).toEqual(createdFavorite);
      expect(favoriteRepository.findByUserAndContent).toHaveBeenCalledWith(
        userId,
        contentId,
        contentType
      );
      expect(favoriteRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          contentId,
          contentType,
        })
      );
      expect(analyticsRealtime.trackFavoriteDelta).toHaveBeenCalledWith(1);
    });

    it('should add TV show to favorites successfully', async () => {
      const userId = 1;
      const contentId = '67890';
      const contentType = 'tv';

      const createdFavorite = {
        id: 2,
        userId,
        contentId,
        contentType,
        createdAt: new Date(),
      };

      favoriteRepository.findByUserAndContent.mockResolvedValue(null);
      favoriteRepository.create.mockResolvedValue(createdFavorite);

      const result = await service.addToFavorites(userId, contentId, contentType);

      expect(result).toEqual(createdFavorite);
      expect(result.contentType).toBe('tv');
    });

    it('should throw error if item already in favorites', async () => {
      const userId = 1;
      const contentId = '12345';
      const contentType = 'movie';

      const existingFavorite = {
        id: 1,
        userId,
        contentId,
        contentType,
      };

      favoriteRepository.findByUserAndContent.mockResolvedValue(existingFavorite);

      await expect(
        service.addToFavorites(userId, contentId, contentType)
      ).rejects.toThrow('Item already in favorites');

      expect(favoriteRepository.create).not.toHaveBeenCalled();
      expect(analyticsRealtime.trackFavoriteDelta).not.toHaveBeenCalled();
    });

    it('should track analytics delta even if analytics fails', async () => {
      const userId = 1;
      const contentId = '12345';
      const contentType = 'movie';

      const createdFavorite = {
        id: 1,
        userId,
        contentId,
        contentType,
      };

      favoriteRepository.findByUserAndContent.mockResolvedValue(null);
      favoriteRepository.create.mockResolvedValue(createdFavorite);
      analyticsRealtime.trackFavoriteDelta.mockRejectedValue(new Error('Analytics error'));

      // Should not throw even if analytics fails
      const result = await service.addToFavorites(userId, contentId, contentType);

      expect(result).toEqual(createdFavorite);
    });
  });

  describe('removeFromFavorites', () => {
    it('should remove favorite successfully', async () => {
      const userId = 1;
      const contentId = '12345';
      const contentType = 'movie';

      const deleteResult = { affected: 1 };

      favoriteRepository.delete.mockResolvedValue(deleteResult);

      const result = await service.removeFromFavorites(userId, contentId, contentType);

      expect(result).toEqual(deleteResult);
      expect(favoriteRepository.delete).toHaveBeenCalledWith(
        userId,
        contentId,
        contentType
      );
      expect(analyticsRealtime.trackFavoriteDelta).toHaveBeenCalledWith(-1);
    });

    it('should not track analytics if nothing was deleted', async () => {
      const userId = 1;
      const contentId = '12345';
      const contentType = 'movie';

      const deleteResult = { affected: 0 };

      favoriteRepository.delete.mockResolvedValue(deleteResult);

      await service.removeFromFavorites(userId, contentId, contentType);

      expect(analyticsRealtime.trackFavoriteDelta).not.toHaveBeenCalled();
    });

    it('should handle analytics error gracefully', async () => {
      const userId = 1;
      const contentId = '12345';
      const contentType = 'movie';

      const deleteResult = { affected: 1 };

      favoriteRepository.delete.mockResolvedValue(deleteResult);
      analyticsRealtime.trackFavoriteDelta.mockRejectedValue(new Error('Analytics error'));

      // Should not throw even if analytics fails
      const result = await service.removeFromFavorites(userId, contentId, contentType);

      expect(result).toEqual(deleteResult);
    });
  });

  describe('getUserFavoriteIds', () => {
    it('should return array of favorite IDs', async () => {
      const userId = 1;
      const mockIds = ['12345', '67890', '11111'];

      favoriteRepository.findIdsByUserId.mockResolvedValue(mockIds);

      const result = await service.getUserFavoriteIds(userId);

      expect(result).toEqual(mockIds);
      expect(favoriteRepository.findIdsByUserId).toHaveBeenCalledWith(userId);
    });

    it('should return empty array if user has no favorites', async () => {
      const userId = 1;

      favoriteRepository.findIdsByUserId.mockResolvedValue([]);

      const result = await service.getUserFavoriteIds(userId);

      expect(result).toEqual([]);
    });
  });

  describe('checkIsFavorite', () => {
    it('should return true if item is favorited', async () => {
      const userId = 1;
      const contentId = '12345';
      const contentType = 'movie';

      favoriteRepository.checkExists.mockResolvedValue(true);

      const result = await service.checkIsFavorite(userId, contentId, contentType);

      expect(result).toBe(true);
      expect(favoriteRepository.checkExists).toHaveBeenCalledWith(
        userId,
        contentId,
        contentType
      );
    });

    it('should return false if item is not favorited', async () => {
      const userId = 1;
      const contentId = '12345';
      const contentType = 'movie';

      favoriteRepository.checkExists.mockResolvedValue(false);

      const result = await service.checkIsFavorite(userId, contentId, contentType);

      expect(result).toBe(false);
    });

    it('should check TV show favorites correctly', async () => {
      const userId = 1;
      const contentId = '67890';
      const contentType = 'tv';

      favoriteRepository.checkExists.mockResolvedValue(true);

      const result = await service.checkIsFavorite(userId, contentId, contentType);

      expect(result).toBe(true);
      expect(favoriteRepository.checkExists).toHaveBeenCalledWith(
        userId,
        contentId,
        'tv'
      );
    });
  });
});
