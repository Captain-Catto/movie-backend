import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FavoriteController } from './favorite.controller';

describe('FavoriteController', () => {
  let controller: FavoriteController;
  let favoriteService: any;

  beforeEach(() => {
    // Mock FavoriteService
    favoriteService = {
      getUserFavorites: vi.fn(),
      addToFavorites: vi.fn(),
      removeFromFavorites: vi.fn(),
      getUserFavoriteIds: vi.fn(),
      checkIsFavorite: vi.fn(),
    };

    controller = new FavoriteController(favoriteService);
  });

  describe('getUserFavorites', () => {
    it('should get user favorites with default pagination', async () => {
      const userId = 1;
      const mockResult = {
        favorites: [
          { id: 1, contentId: '12345', contentType: 'movie' },
          { id: 2, contentId: '67890', contentType: 'tv' },
        ],
        total: 2,
        page: 1,
        totalPages: 1,
        hasMore: false,
      };

      favoriteService.getUserFavorites.mockResolvedValue(mockResult);

      const result = await controller.getUserFavorites(userId, '1', '20');

      expect(result).toEqual(mockResult);
      expect(favoriteService.getUserFavorites).toHaveBeenCalledWith(userId, {
        page: 1,
        limit: 20,
      });
    });

    it('should get user favorites with custom pagination', async () => {
      const userId = 1;
      const mockResult = {
        favorites: [],
        total: 50,
        page: 3,
        totalPages: 5,
        hasMore: true,
      };

      favoriteService.getUserFavorites.mockResolvedValue(mockResult);

      const result = await controller.getUserFavorites(userId, '3', '10');

      expect(result).toEqual(mockResult);
      expect(favoriteService.getUserFavorites).toHaveBeenCalledWith(userId, {
        page: 3,
        limit: 10,
      });
    });

    it('should handle invalid page number gracefully', async () => {
      const userId = 1;
      const mockResult = {
        favorites: [],
        total: 0,
        page: 1,
        totalPages: 0,
        hasMore: false,
      };

      favoriteService.getUserFavorites.mockResolvedValue(mockResult);

      const result = await controller.getUserFavorites(userId, 'invalid', '20');

      expect(result).toEqual(mockResult);
      expect(favoriteService.getUserFavorites).toHaveBeenCalledWith(userId, {
        page: 1, // Default when invalid
        limit: 20,
      });
    });

    it('should handle invalid limit gracefully', async () => {
      const userId = 1;
      const mockResult = {
        favorites: [],
        total: 0,
        page: 1,
        totalPages: 0,
        hasMore: false,
      };

      favoriteService.getUserFavorites.mockResolvedValue(mockResult);

      const result = await controller.getUserFavorites(userId, '1', 'abc');

      expect(result).toEqual(mockResult);
      expect(favoriteService.getUserFavorites).toHaveBeenCalledWith(userId, {
        page: 1,
        limit: 20, // Default when invalid
      });
    });
  });

  describe('addToFavorites', () => {
    it('should add movie to favorites', async () => {
      const userId = 1;
      const body = {
        contentId: '12345',
        contentType: 'movie' as const,
      };

      const mockFavorite = {
        id: 1,
        userId,
        contentId: '12345',
        contentType: 'movie',
        createdAt: new Date(),
      };

      favoriteService.addToFavorites.mockResolvedValue(mockFavorite);

      const result = await controller.addToFavorites(userId, body);

      expect(result).toEqual(mockFavorite);
      expect(favoriteService.addToFavorites).toHaveBeenCalledWith(
        userId,
        '12345',
        'movie'
      );
    });

    it('should add TV show to favorites', async () => {
      const userId = 1;
      const body = {
        contentId: '67890',
        contentType: 'tv' as const,
      };

      const mockFavorite = {
        id: 2,
        userId,
        contentId: '67890',
        contentType: 'tv',
        createdAt: new Date(),
      };

      favoriteService.addToFavorites.mockResolvedValue(mockFavorite);

      const result = await controller.addToFavorites(userId, body);

      expect(result).toEqual(mockFavorite);
      expect(favoriteService.addToFavorites).toHaveBeenCalledWith(
        userId,
        '67890',
        'tv'
      );
    });

    it('should throw error if item already in favorites', async () => {
      const userId = 1;
      const body = {
        contentId: '12345',
        contentType: 'movie' as const,
      };

      favoriteService.addToFavorites.mockRejectedValue(
        new Error('Item already in favorites')
      );

      await expect(controller.addToFavorites(userId, body)).rejects.toThrow(
        'Item already in favorites'
      );
    });
  });

  describe('removeFromFavorites', () => {
    it('should remove favorite successfully', async () => {
      const userId = 1;
      const body = {
        contentId: '12345',
        contentType: 'movie' as const,
      };

      favoriteService.removeFromFavorites.mockResolvedValue({ affected: 1 });

      const result = await controller.removeFromFavorites(userId, body);

      expect(result).toEqual({
        message: 'Removed from favorites successfully',
        success: true,
      });
      expect(favoriteService.removeFromFavorites).toHaveBeenCalledWith(
        userId,
        '12345',
        'movie'
      );
    });

    it('should handle removing TV show from favorites', async () => {
      const userId = 1;
      const body = {
        contentId: '67890',
        contentType: 'tv' as const,
      };

      favoriteService.removeFromFavorites.mockResolvedValue({ affected: 1 });

      const result = await controller.removeFromFavorites(userId, body);

      expect(result.success).toBe(true);
      expect(favoriteService.removeFromFavorites).toHaveBeenCalledWith(
        userId,
        '67890',
        'tv'
      );
    });

    it('should return success even if item not found', async () => {
      const userId = 1;
      const body = {
        contentId: '99999',
        contentType: 'movie' as const,
      };

      favoriteService.removeFromFavorites.mockResolvedValue({ affected: 0 });

      const result = await controller.removeFromFavorites(userId, body);

      expect(result.success).toBe(true);
    });
  });

  describe('getUserFavoriteIds', () => {
    it('should return favorite IDs', async () => {
      const userId = 1;
      const mockIds = ['12345', '67890', '11111'];

      favoriteService.getUserFavoriteIds.mockResolvedValue(mockIds);

      const result = await controller.getUserFavoriteIds(userId);

      expect(result).toEqual({
        ids: mockIds,
        total: 3,
      });
      expect(favoriteService.getUserFavoriteIds).toHaveBeenCalledWith(userId);
    });

    it('should return empty array if user has no favorites', async () => {
      const userId = 1;

      favoriteService.getUserFavoriteIds.mockResolvedValue([]);

      const result = await controller.getUserFavoriteIds(userId);

      expect(result).toEqual({
        ids: [],
        total: 0,
      });
    });

    it('should handle large number of favorites', async () => {
      const userId = 1;
      const mockIds = Array.from({ length: 100 }, (_, i) => `id-${i}`);

      favoriteService.getUserFavoriteIds.mockResolvedValue(mockIds);

      const result = await controller.getUserFavoriteIds(userId);

      expect(result.total).toBe(100);
      expect(result.ids).toHaveLength(100);
    });
  });

  describe('checkIsFavorite', () => {
    it('should return true if movie is favorited', async () => {
      const userId = 1;
      const contentId = '12345';
      const contentType = 'movie';

      favoriteService.checkIsFavorite.mockResolvedValue(true);

      const result = await controller.checkIsFavorite(
        userId,
        contentId,
        contentType as 'movie'
      );

      expect(result).toEqual({
        isFavorite: true,
        contentId: '12345',
        contentType: 'movie',
      });
      expect(favoriteService.checkIsFavorite).toHaveBeenCalledWith(
        userId,
        contentId,
        contentType
      );
    });

    it('should return false if movie is not favorited', async () => {
      const userId = 1;
      const contentId = '12345';
      const contentType = 'movie';

      favoriteService.checkIsFavorite.mockResolvedValue(false);

      const result = await controller.checkIsFavorite(
        userId,
        contentId,
        contentType as 'movie'
      );

      expect(result).toEqual({
        isFavorite: false,
        contentId: '12345',
        contentType: 'movie',
      });
    });

    it('should check TV show favorites correctly', async () => {
      const userId = 1;
      const contentId = '67890';
      const contentType = 'tv';

      favoriteService.checkIsFavorite.mockResolvedValue(true);

      const result = await controller.checkIsFavorite(
        userId,
        contentId,
        contentType as 'tv'
      );

      expect(result).toEqual({
        isFavorite: true,
        contentId: '67890',
        contentType: 'tv',
      });
    });

    it('should handle non-existent content', async () => {
      const userId = 1;
      const contentId = '99999';
      const contentType = 'movie';

      favoriteService.checkIsFavorite.mockResolvedValue(false);

      const result = await controller.checkIsFavorite(
        userId,
        contentId,
        contentType as 'movie'
      );

      expect(result.isFavorite).toBe(false);
    });
  });
});
