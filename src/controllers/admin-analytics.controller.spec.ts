import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock entities
vi.mock('../entities/user.entity', () => ({
  UserRole: {
    USER: 'user',
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin',
    VIEWER: 'viewer',
  },
}));

vi.mock('../entities', () => ({
  ContentType: {
    MOVIE: 'movie',
    TV_SERIES: 'tv',
  },
}));

vi.mock('../entities/viewer-audit-log.entity', () => ({
  ViewerAuditLog: class ViewerAuditLog {},
}));

const { AdminAnalyticsController } = await import('./admin-analytics.controller');
const { ContentType } = await import('../entities');

describe('AdminAnalyticsController', () => {
  let controller: AdminAnalyticsController;
  let adminAnalyticsService: any;

  beforeEach(() => {
    // Mock AdminAnalyticsService
    adminAnalyticsService = {
      getAnalyticsOverview: vi.fn(),
      getViewStats: vi.fn(),
      getMostViewedContent: vi.fn(),
      getClickStats: vi.fn(),
      getPlayStats: vi.fn(),
      getFavoriteStats: vi.fn(),
      getPopularContent: vi.fn(),
      getDeviceStats: vi.fn(),
      getCountryStats: vi.fn(),
    };

    controller = new AdminAnalyticsController(adminAnalyticsService);
  });

  describe('getOverview', () => {
    it('should get analytics overview successfully', async () => {
      const mockData = {
        views: { total: 1000, byType: { movies: 600, tvSeries: 400 } },
        favorites: { total: 100, byType: { movies: 60, tvSeries: 40 } },
        popularContent: [],
      };

      adminAnalyticsService.getAnalyticsOverview.mockResolvedValue(mockData);

      const result = await controller.getOverview();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Analytics overview retrieved successfully');
      expect(result.data).toEqual(mockData);
    });

    it('should handle errors when getting overview', async () => {
      adminAnalyticsService.getAnalyticsOverview.mockRejectedValue(
        new Error('Database error')
      );

      const result = await controller.getOverview();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to retrieve analytics overview');
      expect(result.error).toBe('Database error');
    });
  });

  describe('getViewStats', () => {
    it('should get view statistics without filters', async () => {
      const mockData = {
        total: 1000,
        byType: { movies: 600, tvSeries: 400 },
        trend: [],
      };

      adminAnalyticsService.getViewStats.mockResolvedValue(mockData);

      const result = await controller.getViewStats();

      expect(result.success).toBe(true);
      expect(result.message).toBe('View statistics retrieved successfully');
      expect(result.data).toEqual(mockData);
      expect(adminAnalyticsService.getViewStats).toHaveBeenCalledWith({});
    });

    it('should filter by date range', async () => {
      const mockData = { total: 500, byType: {}, trend: [] };

      adminAnalyticsService.getViewStats.mockResolvedValue(mockData);

      const result = await controller.getViewStats('2024-01-01', '2024-01-31');

      expect(result.success).toBe(true);
      expect(adminAnalyticsService.getViewStats).toHaveBeenCalledWith({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });
    });

    it('should filter by content type: movie', async () => {
      const mockData = { total: 600, byType: {}, trend: [] };

      adminAnalyticsService.getViewStats.mockResolvedValue(mockData);

      const result = await controller.getViewStats(undefined, undefined, 'movie');

      expect(result.success).toBe(true);
      expect(adminAnalyticsService.getViewStats).toHaveBeenCalledWith({
        contentType: ContentType.MOVIE,
      });
    });

    it('should filter by content type: tv', async () => {
      const mockData = { total: 400, byType: {}, trend: [] };

      adminAnalyticsService.getViewStats.mockResolvedValue(mockData);

      const result = await controller.getViewStats(undefined, undefined, 'tv');

      expect(result.success).toBe(true);
      expect(adminAnalyticsService.getViewStats).toHaveBeenCalledWith({
        contentType: ContentType.TV_SERIES,
      });
    });

    it('should map tv_series to TV_SERIES enum', async () => {
      adminAnalyticsService.getViewStats.mockResolvedValue({});

      await controller.getViewStats(undefined, undefined, 'tv_series');

      expect(adminAnalyticsService.getViewStats).toHaveBeenCalledWith({
        contentType: ContentType.TV_SERIES,
      });
    });

    it('should handle errors', async () => {
      adminAnalyticsService.getViewStats.mockRejectedValue(
        new Error('Query error')
      );

      const result = await controller.getViewStats();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to retrieve view statistics');
    });
  });

  describe('getMostViewed', () => {
    it('should get most viewed content with default limit', async () => {
      const mockData = [
        { contentId: '123', title: 'Movie 1', viewCount: 1000 },
        { contentId: '456', title: 'TV Show 1', viewCount: 800 },
      ];

      adminAnalyticsService.getMostViewedContent.mockResolvedValue(mockData);

      const result = await controller.getMostViewed();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Most viewed content retrieved successfully');
      expect(result.data).toEqual(mockData);
      expect(adminAnalyticsService.getMostViewedContent).toHaveBeenCalledWith(
        20,
        undefined
      );
    });

    it('should get most viewed with custom limit', async () => {
      adminAnalyticsService.getMostViewedContent.mockResolvedValue([]);

      const result = await controller.getMostViewed(10);

      expect(result.success).toBe(true);
      expect(adminAnalyticsService.getMostViewedContent).toHaveBeenCalledWith(
        10,
        undefined
      );
    });

    it('should filter by content type: movie', async () => {
      adminAnalyticsService.getMostViewedContent.mockResolvedValue([]);

      const result = await controller.getMostViewed(undefined, 'movie');

      expect(result.success).toBe(true);
      expect(adminAnalyticsService.getMostViewedContent).toHaveBeenCalledWith(
        20,
        ContentType.MOVIE
      );
    });

    it('should filter by content type: tv_series', async () => {
      adminAnalyticsService.getMostViewedContent.mockResolvedValue([]);

      const result = await controller.getMostViewed(undefined, 'tv_series');

      expect(result.success).toBe(true);
      expect(adminAnalyticsService.getMostViewedContent).toHaveBeenCalledWith(
        20,
        ContentType.TV_SERIES
      );
    });

    it('should handle errors', async () => {
      adminAnalyticsService.getMostViewedContent.mockRejectedValue(
        new Error('Query error')
      );

      const result = await controller.getMostViewed();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to retrieve most viewed content');
    });
  });

  describe('getClickStats', () => {
    it('should get click statistics', async () => {
      const mockData = { total: 500 };

      adminAnalyticsService.getClickStats.mockResolvedValue(mockData);

      const result = await controller.getClickStats();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Click statistics retrieved successfully');
      expect(result.data).toEqual(mockData);
    });

    it('should filter by date range', async () => {
      adminAnalyticsService.getClickStats.mockResolvedValue({ total: 200 });

      await controller.getClickStats('2024-01-01', '2024-01-31');

      expect(adminAnalyticsService.getClickStats).toHaveBeenCalledWith({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });
    });

    it('should filter by content type', async () => {
      adminAnalyticsService.getClickStats.mockResolvedValue({ total: 300 });

      await controller.getClickStats(undefined, undefined, 'movie');

      expect(adminAnalyticsService.getClickStats).toHaveBeenCalledWith({
        contentType: ContentType.MOVIE,
      });
    });
  });

  describe('getPlayStats', () => {
    it('should get play statistics', async () => {
      const mockData = {
        total: 300,
        bySource: { detail_page: 150, home_page: 100 },
      };

      adminAnalyticsService.getPlayStats.mockResolvedValue(mockData);

      const result = await controller.getPlayStats();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Play statistics retrieved successfully');
      expect(result.data).toEqual(mockData);
    });

    it('should filter by date range and content type', async () => {
      adminAnalyticsService.getPlayStats.mockResolvedValue({ total: 100, bySource: {} });

      await controller.getPlayStats('2024-01-01', '2024-01-31', 'tv');

      expect(adminAnalyticsService.getPlayStats).toHaveBeenCalledWith({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        contentType: ContentType.TV_SERIES,
      });
    });
  });

  describe('getFavoriteStats', () => {
    it('should get favorite statistics without filter', async () => {
      const mockData = {
        total: 100,
        byType: { movies: 60, tvSeries: 40 },
        mostFavorited: [],
        trend: [],
      };

      adminAnalyticsService.getFavoriteStats.mockResolvedValue(mockData);

      const result = await controller.getFavoriteStats();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Favorite statistics retrieved successfully');
      expect(result.data).toEqual(mockData);
      expect(adminAnalyticsService.getFavoriteStats).toHaveBeenCalledWith(
        undefined
      );
    });

    it('should filter by content type: movie', async () => {
      adminAnalyticsService.getFavoriteStats.mockResolvedValue({ total: 60 });

      await controller.getFavoriteStats('movie');

      expect(adminAnalyticsService.getFavoriteStats).toHaveBeenCalledWith(
        ContentType.MOVIE
      );
    });

    it('should filter by content type: tv', async () => {
      adminAnalyticsService.getFavoriteStats.mockResolvedValue({ total: 40 });

      await controller.getFavoriteStats('tv');

      expect(adminAnalyticsService.getFavoriteStats).toHaveBeenCalledWith(
        ContentType.TV_SERIES
      );
    });

    it('should handle errors', async () => {
      adminAnalyticsService.getFavoriteStats.mockRejectedValue(
        new Error('Database error')
      );

      const result = await controller.getFavoriteStats();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to retrieve favorite statistics');
    });
  });

  describe('getPopularContent', () => {
    it('should get popular content with default limit', async () => {
      const mockData = [
        { tmdbId: 123, title: 'Popular Movie', viewCount: 1000, favoriteCount: 50 },
        { tmdbId: 456, title: 'Popular TV', viewCount: 800, favoriteCount: 40 },
      ];

      adminAnalyticsService.getPopularContent.mockResolvedValue(mockData);

      const result = await controller.getPopularContent();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Popular content retrieved successfully');
      expect(result.data).toEqual(mockData);
      expect(adminAnalyticsService.getPopularContent).toHaveBeenCalledWith(20);
    });

    it('should get popular content with custom limit', async () => {
      adminAnalyticsService.getPopularContent.mockResolvedValue([]);

      const result = await controller.getPopularContent(10);

      expect(result.success).toBe(true);
      expect(adminAnalyticsService.getPopularContent).toHaveBeenCalledWith(10);
    });

    it('should handle errors', async () => {
      adminAnalyticsService.getPopularContent.mockRejectedValue(
        new Error('Query error')
      );

      const result = await controller.getPopularContent();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to retrieve popular content');
    });
  });

  describe('getDeviceStats', () => {
    it('should get device statistics', async () => {
      const mockData = [
        { device: 'desktop', count: 500 },
        { device: 'mobile', count: 300 },
        { device: 'tablet', count: 100 },
      ];

      adminAnalyticsService.getDeviceStats.mockResolvedValue(mockData);

      const result = await controller.getDeviceStats();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Device statistics retrieved successfully');
      expect(result.data).toEqual(mockData);
    });

    it('should handle errors', async () => {
      adminAnalyticsService.getDeviceStats.mockRejectedValue(
        new Error('Database error')
      );

      const result = await controller.getDeviceStats();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to retrieve device statistics');
    });
  });

  describe('getCountryStats', () => {
    it('should get country statistics', async () => {
      const mockData = [
        { country: 'US', count: 1000 },
        { country: 'VN', count: 500 },
        { country: 'UK', count: 300 },
      ];

      adminAnalyticsService.getCountryStats.mockResolvedValue(mockData);

      const result = await controller.getCountryStats();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Country statistics retrieved successfully');
      expect(result.data).toEqual(mockData);
    });

    it('should handle errors', async () => {
      adminAnalyticsService.getCountryStats.mockRejectedValue(
        new Error('Database error')
      );

      const result = await controller.getCountryStats();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to retrieve country statistics');
    });
  });
});
