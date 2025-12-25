import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock entities
vi.mock('../entities', () => ({
  ViewAnalytics: class ViewAnalytics {},
  Movie: class Movie {},
  TVSeries: class TVSeries {},
  Favorite: class Favorite {},
  ActionType: {
    VIEW: 'view',
    CLICK: 'click',
    PLAY: 'play',
  },
  ContentType: {
    MOVIE: 'movie',
    TV_SERIES: 'tv',
  },
}));

const { AdminAnalyticsService } = await import('./admin-analytics.service');
const { ActionType, ContentType } = await import('../entities');

describe('AdminAnalyticsService', () => {
  let service: AdminAnalyticsService;
  let viewAnalyticsRepository: any;
  let movieRepository: any;
  let tvRepository: any;
  let favoriteRepository: any;

  beforeEach(() => {
    // Mock repositories
    viewAnalyticsRepository = {
      createQueryBuilder: vi.fn(),
      count: vi.fn(),
    };

    movieRepository = {
      createQueryBuilder: vi.fn(),
      find: vi.fn(),
    };

    tvRepository = {
      createQueryBuilder: vi.fn(),
      find: vi.fn(),
    };

    favoriteRepository = {
      count: vi.fn(),
      createQueryBuilder: vi.fn(),
    };

    service = new AdminAnalyticsService(
      viewAnalyticsRepository,
      movieRepository,
      tvRepository,
      favoriteRepository
    );
  });

  describe('getViewStats', () => {
    it('should get total view statistics', async () => {
      const mockQueryBuilder = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getCount: vi.fn().mockResolvedValue(1000),
      };

      const mockTrendQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getRawMany: vi.fn().mockResolvedValue([
          { date: '2024-01-01', count: '50' },
          { date: '2024-01-02', count: '75' },
        ]),
      };

      viewAnalyticsRepository.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder)
        .mockReturnValueOnce(mockTrendQueryBuilder);

      viewAnalyticsRepository.count
        .mockResolvedValueOnce(600) // movie views
        .mockResolvedValueOnce(400); // tv views

      const result = await service.getViewStats();

      expect(result).toEqual({
        total: 1000,
        byType: {
          movies: 600,
          tvSeries: 400,
        },
        trend: [
          { date: '2024-01-01', views: 50 },
          { date: '2024-01-02', views: 75 },
        ],
      });
    });

    it('should filter by date range', async () => {
      const mockQueryBuilder = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getCount: vi.fn().mockResolvedValue(500),
      };

      const mockTrendQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getRawMany: vi.fn().mockResolvedValue([]),
      };

      viewAnalyticsRepository.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder)
        .mockReturnValueOnce(mockTrendQueryBuilder);

      viewAnalyticsRepository.count.mockResolvedValue(0);

      await service.getViewStats({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'analytics.createdAt >= :startDate',
        { startDate: '2024-01-01' }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'analytics.createdAt < :endDate',
        { endDate: expect.any(Date) }
      );
    });

    it('should filter by content type', async () => {
      const mockQueryBuilder = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getCount: vi.fn().mockResolvedValue(300),
      };

      const mockTrendQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getRawMany: vi.fn().mockResolvedValue([]),
      };

      viewAnalyticsRepository.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder)
        .mockReturnValueOnce(mockTrendQueryBuilder);

      viewAnalyticsRepository.count.mockResolvedValue(0);

      await service.getViewStats({ contentType: ContentType.MOVIE });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'analytics.contentType = :contentType',
        { contentType: ContentType.MOVIE }
      );
    });
  });

  describe('getMostViewedContent', () => {
    it('should get most viewed content', async () => {
      const mockResults = [
        { contentId: '123', contentType: ContentType.MOVIE, title: 'Movie 1', viewCount: '100' },
        { contentId: '456', contentType: ContentType.TV_SERIES, title: 'TV Show 1', viewCount: '80' },
      ];

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        getRawMany: vi.fn().mockResolvedValue(mockResults),
      };

      const mockMovieQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([
          { tmdbId: 123, posterPath: '/movie1.jpg' },
        ]),
      };

      const mockTvQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([
          { tmdbId: 456, posterPath: '/tv1.jpg' },
        ]),
      };

      viewAnalyticsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      movieRepository.createQueryBuilder.mockReturnValue(mockMovieQueryBuilder);
      tvRepository.createQueryBuilder.mockReturnValue(mockTvQueryBuilder);

      const result = await service.getMostViewedContent(20);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        contentId: '123',
        contentType: ContentType.MOVIE,
        title: 'Movie 1',
        viewCount: 100,
        posterPath: '/movie1.jpg',
      });
      expect(result[1]).toEqual({
        contentId: '456',
        contentType: ContentType.TV_SERIES,
        title: 'TV Show 1',
        viewCount: 80,
        posterPath: '/tv1.jpg',
      });
    });

    it('should filter by content type', async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        getRawMany: vi.fn().mockResolvedValue([]),
      };

      viewAnalyticsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getMostViewedContent(10, ContentType.MOVIE);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'analytics.contentType = :contentType',
        { contentType: ContentType.MOVIE }
      );
    });
  });

  describe('getClickStats', () => {
    it('should get click statistics', async () => {
      const mockQueryBuilder = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getCount: vi.fn().mockResolvedValue(500),
      };

      viewAnalyticsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getClickStats();

      expect(result).toEqual({ total: 500 });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'analytics.actionType = :action',
        { action: ActionType.CLICK }
      );
    });

    it('should filter click stats by date range', async () => {
      const mockQueryBuilder = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getCount: vi.fn().mockResolvedValue(200),
      };

      viewAnalyticsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getClickStats({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'analytics.createdAt >= :startDate',
        { startDate: '2024-01-01' }
      );
    });
  });

  describe('getPlayStats', () => {
    it('should get play statistics with source breakdown', async () => {
      const mockQueryBuilder = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getCount: vi.fn().mockResolvedValue(300),
      };

      const mockSourceQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        getRawMany: vi.fn().mockResolvedValue([
          { source: 'detail_page', count: '150' },
          { source: 'home_page', count: '100' },
          { source: 'unknown', count: '50' },
        ]),
      };

      viewAnalyticsRepository.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder)
        .mockReturnValueOnce(mockSourceQueryBuilder);

      const result = await service.getPlayStats();

      expect(result).toEqual({
        total: 300,
        bySource: {
          detail_page: 150,
          home_page: 100,
          unknown: 50,
        },
      });
    });
  });

  describe('getFavoriteStats', () => {
    it('should get favorite statistics', async () => {
      const mockMostFavoritedQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        getRawMany: vi.fn().mockResolvedValue([
          { contentId: '123', contentType: 'movie', favoriteCount: '50' },
          { contentId: '456', contentType: 'tv', favoriteCount: '40' },
        ]),
      };

      const mockTrendQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getRawMany: vi.fn().mockResolvedValue([
          { date: '2024-01-01', count: '10' },
          { date: '2024-01-02', count: '15' },
        ]),
      };

      const mockMovieQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([
          { tmdbId: 123, title: 'Movie 1', posterPath: '/movie1.jpg' },
        ]),
      };

      const mockTvQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([
          { tmdbId: 456, title: 'TV Show 1', posterPath: '/tv1.jpg' },
        ]),
      };

      favoriteRepository.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(60) // movies
        .mockResolvedValueOnce(40); // tv

      favoriteRepository.createQueryBuilder
        .mockReturnValueOnce(mockMostFavoritedQueryBuilder)
        .mockReturnValueOnce(mockTrendQueryBuilder);

      movieRepository.createQueryBuilder.mockReturnValue(mockMovieQueryBuilder);
      tvRepository.createQueryBuilder.mockReturnValue(mockTvQueryBuilder);

      const result = await service.getFavoriteStats();

      expect(result.total).toBe(100);
      expect(result.byType).toEqual({ movies: 60, tvSeries: 40 });
      expect(result.mostFavorited).toHaveLength(2);
      expect(result.mostFavorited[0]).toMatchObject({
        contentId: '123',
        contentType: 'movie',
        count: 50,
        title: 'Movie 1',
        posterPath: '/movie1.jpg',
      });
    });

    it('should filter favorites by content type', async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        getRawMany: vi.fn().mockResolvedValue([]),
      };

      const mockTrendQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getRawMany: vi.fn().mockResolvedValue([]),
      };

      favoriteRepository.count.mockResolvedValue(60);
      favoriteRepository.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder)
        .mockReturnValueOnce(mockTrendQueryBuilder);

      await service.getFavoriteStats(ContentType.MOVIE);

      expect(favoriteRepository.count).toHaveBeenCalledWith({
        where: { contentType: 'movie' },
      });
    });
  });

  describe('getPopularContent', () => {
    it('should get popular content combining views and favorites', async () => {
      const mockMovies = [
        { tmdbId: 123, title: 'Popular Movie', viewCount: 1000, clickCount: 500, posterPath: '/movie.jpg', isBlocked: false },
      ];

      const mockTvSeries = [
        { tmdbId: 456, title: 'Popular TV', viewCount: 800, clickCount: 400, posterPath: '/tv.jpg', isBlocked: false },
      ];

      movieRepository.find.mockResolvedValue(mockMovies);
      tvRepository.find.mockResolvedValue(mockTvSeries);

      favoriteRepository.count
        .mockResolvedValueOnce(50) // movie favorite count
        .mockResolvedValueOnce(40); // tv favorite count

      const result = await service.getPopularContent(20);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        tmdbId: 123,
        title: 'Popular Movie',
        contentType: 'movie',
        viewCount: 1000,
        favoriteCount: 50,
      });
      expect(result[1]).toMatchObject({
        tmdbId: 456,
        title: 'Popular TV',
        contentType: 'tv',
        viewCount: 800,
        favoriteCount: 40,
      });
    });

    it('should limit results correctly', async () => {
      movieRepository.find.mockResolvedValue([]);
      tvRepository.find.mockResolvedValue([]);

      await service.getPopularContent(10);

      expect(movieRepository.find).toHaveBeenCalledWith({
        where: { isBlocked: false },
        order: { viewCount: 'DESC' },
        take: 10,
      });
    });
  });

  describe('getAnalyticsOverview', () => {
    it('should get complete analytics overview', async () => {
      // Mock getViewStats - needs 2 query builders (count + trend)
      const mockViewCountQueryBuilder = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getCount: vi.fn().mockResolvedValue(1000),
      };

      const mockViewTrendQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getRawMany: vi.fn().mockResolvedValue([]),
      };

      viewAnalyticsRepository.createQueryBuilder
        .mockReturnValueOnce(mockViewCountQueryBuilder)
        .mockReturnValueOnce(mockViewTrendQueryBuilder);
      viewAnalyticsRepository.count.mockResolvedValue(0);

      // Mock getFavoriteStats - needs 2 query builders (most favorited + trend)
      const mockFavMostFavoritedQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        getRawMany: vi.fn().mockResolvedValue([]),
      };

      const mockFavTrendQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getRawMany: vi.fn().mockResolvedValue([]),
      };

      favoriteRepository.count.mockResolvedValue(0);
      favoriteRepository.createQueryBuilder
        .mockReturnValueOnce(mockFavMostFavoritedQueryBuilder)
        .mockReturnValueOnce(mockFavTrendQueryBuilder);

      // Mock getPopularContent
      movieRepository.find.mockResolvedValue([]);
      tvRepository.find.mockResolvedValue([]);

      const result = await service.getAnalyticsOverview();

      expect(result).toHaveProperty('views');
      expect(result).toHaveProperty('favorites');
      expect(result).toHaveProperty('popularContent');
    });
  });

  describe('getDeviceStats', () => {
    it('should get device statistics', async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        getRawMany: vi.fn().mockResolvedValue([
          { deviceType: 'desktop', count: '500' },
          { deviceType: 'mobile', count: '300' },
          { deviceType: 'tablet', count: '100' },
        ]),
      };

      viewAnalyticsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getDeviceStats();

      expect(result).toEqual([
        { device: 'desktop', count: 500 },
        { device: 'mobile', count: 300 },
        { device: 'tablet', count: 100 },
      ]);
    });
  });

  describe('getCountryStats', () => {
    it('should get country statistics', async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        getRawMany: vi.fn().mockResolvedValue([
          { country: 'US', count: '1000' },
          { country: 'VN', count: '500' },
          { country: 'UK', count: '300' },
        ]),
      };

      viewAnalyticsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getCountryStats();

      expect(result).toEqual([
        { country: 'US', count: 1000 },
        { country: 'VN', count: 500 },
        { country: 'UK', count: 300 },
      ]);
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(20);
    });
  });
});
