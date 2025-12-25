import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock entities
vi.mock('../entities', () => ({
  ViewAnalytics: class ViewAnalytics {},
  Movie: class Movie {},
  TVSeries: class TVSeries {},
  ActionType: {
    VIEW: 'VIEW',
    CLICK: 'CLICK',
    PLAY: 'PLAY',
    COMPLETE: 'COMPLETE',
  },
  ContentType: {
    MOVIE: 'movie',
    TV_SERIES: 'tv_series',
  },
}));

// Mock ua-parser-js
vi.mock('ua-parser-js', () => {
  const mockImpl = (userAgent?: string) => {
    if (!userAgent) return { device: {} };
    if (userAgent.includes('iPhone') || (userAgent.includes('Android') && userAgent.includes('Mobile'))) {
      return { device: { type: 'mobile' } };
    } else {
      return { device: {} };
    }
  };

  // For CommonJS modules, return default export directly
  return { default: mockImpl };
});

const { AnalyticsService } = await import('./analytics.service');

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let viewAnalyticsRepository: any;
  let movieRepository: any;
  let tvRepository: any;
  let realtimeService: any;

  beforeEach(() => {
    // Mock repositories
    viewAnalyticsRepository = {
      create: vi.fn(),
      save: vi.fn(),
    };

    movieRepository = {
      findOne: vi.fn(),
      save: vi.fn(),
    };

    tvRepository = {
      findOne: vi.fn(),
      save: vi.fn(),
    };

    realtimeService = {
      trackAction: vi.fn().mockResolvedValue(undefined),
    };

    service = new AnalyticsService(
      viewAnalyticsRepository,
      movieRepository,
      tvRepository,
      realtimeService
    );
  });

  describe('trackEvent', () => {
    it('should track VIEW event for movie', async () => {
      const mockAnalytics = {
        id: 1,
        contentId: '123',
        contentType: 'movie',
        actionType: 'VIEW',
      };

      viewAnalyticsRepository.create.mockReturnValue(mockAnalytics);
      viewAnalyticsRepository.save.mockResolvedValue(mockAnalytics);

      await service.trackEvent({
        contentId: '123',
        contentType: 'movie',
        actionType: 'VIEW',
        contentTitle: 'Test Movie',
        userId: 1,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        country: 'US',
      });

      expect(viewAnalyticsRepository.create).toHaveBeenCalledWith({
        contentId: '123',
        contentType: 'movie',
        actionType: 'VIEW',
        contentTitle: 'Test Movie',
        duration: undefined,
        userId: 1,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        deviceType: 'desktop',
        country: 'US',
        metadata: {},
      });
      expect(viewAnalyticsRepository.save).toHaveBeenCalled();
      expect(realtimeService.trackAction).toHaveBeenCalledWith('VIEW');
    });

    it('should track CLICK event for tv series', async () => {
      const mockAnalytics = {
        id: 2,
        contentId: '456',
        contentType: 'tv_series',
        actionType: 'CLICK',
      };

      viewAnalyticsRepository.create.mockReturnValue(mockAnalytics);
      viewAnalyticsRepository.save.mockResolvedValue(mockAnalytics);

      await service.trackEvent({
        contentId: '456',
        contentType: 'tv_series',
        actionType: 'CLICK',
        contentTitle: 'Test TV Show',
        userId: 2,
      });

      expect(viewAnalyticsRepository.create).toHaveBeenCalledWith({
        contentId: '456',
        contentType: 'tv_series',
        actionType: 'CLICK',
        contentTitle: 'Test TV Show',
        duration: undefined,
        userId: 2,
        ipAddress: undefined,
        userAgent: undefined,
        deviceType: 'unknown',
        country: null,
        metadata: {},
      });
    });

    it('should track PLAY event with duration', async () => {
      const mockAnalytics = {
        id: 3,
        contentId: '789',
        contentType: 'movie',
        actionType: 'PLAY',
        duration: 120,
      };

      viewAnalyticsRepository.create.mockReturnValue(mockAnalytics);
      viewAnalyticsRepository.save.mockResolvedValue(mockAnalytics);

      await service.trackEvent({
        contentId: '789',
        contentType: 'movie',
        actionType: 'PLAY',
        duration: 120,
        metadata: { source: 'detail_page' },
      });

      expect(viewAnalyticsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'PLAY',
          duration: 120,
          metadata: { source: 'detail_page' },
        })
      );
    });

    it('should parse mobile user agent', async () => {
      const mockAnalytics = {
        id: 4,
        contentId: '123',
        contentType: 'movie',
        actionType: 'VIEW',
      };

      viewAnalyticsRepository.create.mockReturnValue(mockAnalytics);
      viewAnalyticsRepository.save.mockResolvedValue(mockAnalytics);

      await service.trackEvent({
        contentId: '123',
        contentType: 'movie',
        actionType: 'VIEW',
        userAgent: 'Mozilla/5.0 (iPhone; Mobile Safari/605.1)',
      });

      expect(viewAnalyticsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceType: 'mobile',
        })
      );
    });

    it('should parse desktop user agent', async () => {
      const mockAnalytics = {
        id: 6,
        contentId: '123',
        contentType: 'movie',
        actionType: 'VIEW',
      };

      viewAnalyticsRepository.create.mockReturnValue(mockAnalytics);
      viewAnalyticsRepository.save.mockResolvedValue(mockAnalytics);

      await service.trackEvent({
        contentId: '123',
        contentType: 'movie',
        actionType: 'VIEW',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      });

      expect(viewAnalyticsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceType: 'desktop',
        })
      );
    });

    it('should handle unknown user agent', async () => {
      const mockAnalytics = {
        id: 7,
        contentId: '123',
        contentType: 'movie',
        actionType: 'VIEW',
      };

      viewAnalyticsRepository.create.mockReturnValue(mockAnalytics);
      viewAnalyticsRepository.save.mockResolvedValue(mockAnalytics);

      await service.trackEvent({
        contentId: '123',
        contentType: 'movie',
        actionType: 'VIEW',
        userAgent: undefined,
      });

      expect(viewAnalyticsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceType: 'unknown',
        })
      );
    });

    it('should update movie view counter asynchronously', async () => {
      const mockMovie = {
        tmdbId: 123,
        viewCount: 10,
        clickCount: 5,
      };

      const mockAnalytics = {
        id: 8,
        contentId: '123',
        contentType: 'movie',
        actionType: 'VIEW',
      };

      viewAnalyticsRepository.create.mockReturnValue(mockAnalytics);
      viewAnalyticsRepository.save.mockResolvedValue(mockAnalytics);
      movieRepository.findOne.mockResolvedValue(mockMovie);
      movieRepository.save.mockResolvedValue({ ...mockMovie, viewCount: 11 });

      await service.trackEvent({
        contentId: '123',
        contentType: 'movie',
        actionType: 'VIEW',
      });

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(movieRepository.findOne).toHaveBeenCalledWith({
        where: { tmdbId: 123 },
      });
      expect(movieRepository.save).toHaveBeenCalledWith({
        ...mockMovie,
        viewCount: 11,
      });
    });

    it('should update movie click counter asynchronously', async () => {
      const mockMovie = {
        tmdbId: 456,
        viewCount: 10,
        clickCount: 5,
      };

      const mockAnalytics = {
        id: 9,
        contentId: '456',
        contentType: 'movie',
        actionType: 'CLICK',
      };

      viewAnalyticsRepository.create.mockReturnValue(mockAnalytics);
      viewAnalyticsRepository.save.mockResolvedValue(mockAnalytics);
      movieRepository.findOne.mockResolvedValue(mockMovie);
      movieRepository.save.mockResolvedValue({ ...mockMovie, clickCount: 6 });

      await service.trackEvent({
        contentId: '456',
        contentType: 'movie',
        actionType: 'CLICK',
      });

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(movieRepository.save).toHaveBeenCalledWith({
        ...mockMovie,
        clickCount: 6,
      });
    });

    it('should update tv series view counter asynchronously', async () => {
      const mockTv = {
        tmdbId: 789,
        viewCount: 20,
        clickCount: 10,
      };

      const mockAnalytics = {
        id: 10,
        contentId: '789',
        contentType: 'tv_series',
        actionType: 'VIEW',
      };

      viewAnalyticsRepository.create.mockReturnValue(mockAnalytics);
      viewAnalyticsRepository.save.mockResolvedValue(mockAnalytics);
      tvRepository.findOne.mockResolvedValue(mockTv);
      tvRepository.save.mockResolvedValue({ ...mockTv, viewCount: 21 });

      await service.trackEvent({
        contentId: '789',
        contentType: 'tv_series',
        actionType: 'VIEW',
      });

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(tvRepository.findOne).toHaveBeenCalledWith({
        where: { tmdbId: 789 },
      });
      expect(tvRepository.save).toHaveBeenCalledWith({
        ...mockTv,
        viewCount: 21,
      });
    });

    it('should update tv series click counter asynchronously', async () => {
      const mockTv = {
        tmdbId: 101,
        viewCount: 20,
        clickCount: 10,
      };

      const mockAnalytics = {
        id: 11,
        contentId: '101',
        contentType: 'tv_series',
        actionType: 'CLICK',
      };

      viewAnalyticsRepository.create.mockReturnValue(mockAnalytics);
      viewAnalyticsRepository.save.mockResolvedValue(mockAnalytics);
      tvRepository.findOne.mockResolvedValue(mockTv);
      tvRepository.save.mockResolvedValue({ ...mockTv, clickCount: 11 });

      await service.trackEvent({
        contentId: '101',
        contentType: 'tv_series',
        actionType: 'CLICK',
      });

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(tvRepository.save).toHaveBeenCalledWith({
        ...mockTv,
        clickCount: 11,
      });
    });

    it('should handle missing movie gracefully', async () => {
      const mockAnalytics = {
        id: 12,
        contentId: '999',
        contentType: 'movie',
        actionType: 'VIEW',
      };

      viewAnalyticsRepository.create.mockReturnValue(mockAnalytics);
      viewAnalyticsRepository.save.mockResolvedValue(mockAnalytics);
      movieRepository.findOne.mockResolvedValue(null);

      await service.trackEvent({
        contentId: '999',
        contentType: 'movie',
        actionType: 'VIEW',
      });

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should not throw error
      expect(movieRepository.findOne).toHaveBeenCalled();
      expect(movieRepository.save).not.toHaveBeenCalled();
    });

    it('should handle invalid contentId gracefully', async () => {
      const mockAnalytics = {
        id: 13,
        contentId: 'invalid',
        contentType: 'movie',
        actionType: 'VIEW',
      };

      viewAnalyticsRepository.create.mockReturnValue(mockAnalytics);
      viewAnalyticsRepository.save.mockResolvedValue(mockAnalytics);

      await service.trackEvent({
        contentId: 'invalid',
        contentType: 'movie',
        actionType: 'VIEW',
      });

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should not call findOne for invalid ID
      expect(movieRepository.findOne).not.toHaveBeenCalled();
    });

    it('should handle realtime service errors gracefully', async () => {
      const mockAnalytics = {
        id: 14,
        contentId: '123',
        contentType: 'movie',
        actionType: 'VIEW',
      };

      viewAnalyticsRepository.create.mockReturnValue(mockAnalytics);
      viewAnalyticsRepository.save.mockResolvedValue(mockAnalytics);
      realtimeService.trackAction.mockRejectedValue(new Error('Realtime error'));

      // Should not throw even if realtime service fails
      await service.trackEvent({
        contentId: '123',
        contentType: 'movie',
        actionType: 'VIEW',
      });

      expect(viewAnalyticsRepository.save).toHaveBeenCalled();
    });

    it('should handle analytics save errors', async () => {
      const mockAnalytics = {
        id: 15,
        contentId: '123',
        contentType: 'movie',
        actionType: 'VIEW',
      };

      viewAnalyticsRepository.create.mockReturnValue(mockAnalytics);
      viewAnalyticsRepository.save.mockRejectedValue(new Error('Save error'));

      await expect(
        service.trackEvent({
          contentId: '123',
          contentType: 'movie',
          actionType: 'VIEW',
        })
      ).rejects.toThrow('Save error');
    });
  });
});
