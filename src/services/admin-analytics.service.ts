import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  ViewAnalytics,
  ActionType,
  ContentType as ViewContentType,
  Movie,
  TVSeries,
  Favorite,
} from "../entities";

export interface AnalyticsQuery {
  startDate?: string | Date;
  endDate?: string | Date;
  contentType?: ViewContentType;
  limit?: number;
}

@Injectable()
export class AdminAnalyticsService {
  private readonly logger = new Logger(AdminAnalyticsService.name);

  constructor(
    @InjectRepository(ViewAnalytics)
    private viewAnalyticsRepository: Repository<ViewAnalytics>,
    @InjectRepository(Movie)
    private movieRepository: Repository<Movie>,
    @InjectRepository(TVSeries)
    private tvRepository: Repository<TVSeries>,
    @InjectRepository(Favorite)
    private favoriteRepository: Repository<Favorite>
  ) {}

  // Get view statistics
  async getViewStats(query: AnalyticsQuery = {}) {
    const { startDate, endDate, contentType } = query;

    // Debug logging
    this.logger.log(`[Analytics] getViewStats called with: startDate=${startDate}, endDate=${endDate}, contentType=${contentType}`);

    try {
      const queryBuilder = this.viewAnalyticsRepository
        .createQueryBuilder("analytics")
        .where("analytics.actionType = :action", { action: ActionType.VIEW });

      if (startDate) {
        queryBuilder.andWhere("analytics.createdAt >= :startDate", {
          startDate,
        });
      }

      if (endDate) {
        // Add 1 day to endDate to include the entire end date (use < nextDay instead of <= endDate)
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        queryBuilder.andWhere("analytics.createdAt < :endDate", { endDate: nextDay });
      }

      if (contentType) {
        queryBuilder.andWhere("analytics.contentType = :contentType", {
          contentType,
        });
      }

      const totalViews = await queryBuilder.getCount();
      this.logger.log(`[Analytics] getViewStats result: ${totalViews} views`);

      // Views by content type
      const movieViews = await this.viewAnalyticsRepository.count({
        where: {
          actionType: ActionType.VIEW,
          contentType: ViewContentType.MOVIE,
        },
      });

      const tvViews = await this.viewAnalyticsRepository.count({
        where: {
          actionType: ActionType.VIEW,
          contentType: ViewContentType.TV_SERIES,
        },
      });

      // Get views over time (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const viewsOverTime = await this.viewAnalyticsRepository
        .createQueryBuilder("analytics")
        .select("DATE(analytics.createdAt)", "date")
        .addSelect("COUNT(*)", "count")
        .where("analytics.actionType = :action", { action: ActionType.VIEW })
        .andWhere("analytics.createdAt >= :startDate", {
          startDate: thirtyDaysAgo,
        })
        .groupBy("DATE(analytics.createdAt)")
        .orderBy("DATE(analytics.createdAt)", "ASC")
        .getRawMany();

      return {
        total: totalViews,
        byType: {
          movies: movieViews,
          tvSeries: tvViews,
        },
        trend: viewsOverTime.map((v) => ({
          date: v.date,
          views: parseInt(v.count),
        })),
      };
    } catch (error) {
      this.logger.error("Error getting view stats:", error);
      throw error;
    }
  }

  // Get most viewed content
  async getMostViewedContent(limit: number = 20, contentType?: ViewContentType) {
    try {
      const queryBuilder = this.viewAnalyticsRepository
        .createQueryBuilder("analytics")
        .select("analytics.contentId", "contentId")
        .addSelect("analytics.contentType", "contentType")
        .addSelect("analytics.contentTitle", "title")
        .addSelect("COUNT(*)", "viewCount")
        .where("analytics.actionType = :action", { action: ActionType.VIEW });

      if (contentType) {
        queryBuilder.andWhere("analytics.contentType = :contentType", {
          contentType,
        });
      }

      const results = await queryBuilder
        .groupBy("analytics.contentId, analytics.contentType, analytics.contentTitle")
        .orderBy("COUNT(*)", "DESC")
        .limit(limit)
        .getRawMany();

      return results.map((r) => ({
        contentId: r.contentId,
        contentType: r.contentType,
        title: r.title,
        viewCount: parseInt(r.viewCount),
      }));
    } catch (error) {
      this.logger.error("Error getting most viewed content:", error);
      throw error;
    }
  }

  // Get click statistics
  async getClickStats(query: AnalyticsQuery = {}) {
    const { startDate, endDate, contentType } = query;

    // Debug logging
    this.logger.log(`[Analytics] getClickStats called with: startDate=${startDate}, endDate=${endDate}, contentType=${contentType}`);

    try {
      const queryBuilder = this.viewAnalyticsRepository
        .createQueryBuilder("analytics")
        .where("analytics.actionType = :action", { action: ActionType.CLICK });

      if (startDate) {
        queryBuilder.andWhere("analytics.createdAt >= :startDate", {
          startDate,
        });
      }

      if (endDate) {
        // Add 1 day to endDate to include the entire end date (use < nextDay instead of <= endDate)
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        queryBuilder.andWhere("analytics.createdAt < :endDate", { endDate: nextDay });
      }

      if (contentType) {
        queryBuilder.andWhere("analytics.contentType = :contentType", {
          contentType,
        });
      }

      const totalClicks = await queryBuilder.getCount();
      this.logger.log(`[Analytics] getClickStats result: ${totalClicks} clicks`);

      return {
        total: totalClicks,
      };
    } catch (error) {
      this.logger.error("Error getting click stats:", error);
      throw error;
    }
  }

  // Get play statistics
  async getPlayStats(query: AnalyticsQuery = {}) {
    const { startDate, endDate, contentType } = query;

    // Debug logging
    this.logger.log(`[Analytics] getPlayStats called with: startDate=${startDate}, endDate=${endDate}, contentType=${contentType}`);

    try {
      const queryBuilder = this.viewAnalyticsRepository
        .createQueryBuilder("analytics")
        .where("analytics.actionType = :action", { action: ActionType.PLAY });

      if (startDate) {
        queryBuilder.andWhere("analytics.createdAt >= :startDate", {
          startDate,
        });
      }

      if (endDate) {
        // Add 1 day to endDate to include the entire end date (use < nextDay instead of <= endDate)
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        queryBuilder.andWhere("analytics.createdAt < :endDate", { endDate: nextDay });
      }

      if (contentType) {
        queryBuilder.andWhere("analytics.contentType = :contentType", {
          contentType,
        });
      }

      const totalPlays = await queryBuilder.getCount();

      // Breakdown by metadata.source to understand which play button was used
      const sourceBreakdownRaw = await this.viewAnalyticsRepository
        .createQueryBuilder("analytics")
        .select("COALESCE(analytics.metadata->>'source', 'unknown')", "source")
        .addSelect("COUNT(*)", "count")
        .where("analytics.actionType = :action", { action: ActionType.PLAY })
        .groupBy("source")
        .getRawMany();

      const bySource = sourceBreakdownRaw.reduce<Record<string, number>>(
        (acc, row) => {
          const key = row.source || "unknown";
          acc[key] = parseInt(row.count, 10) || 0;
          return acc;
        },
        {}
      );

      this.logger.log(`[Analytics] getPlayStats result: ${totalPlays} plays`);

      return {
        total: totalPlays,
        bySource,
      };
    } catch (error) {
      this.logger.error("Error getting play stats:", error);
      throw error;
    }
  }

  // Get favorite statistics
  async getFavoriteStats() {
    try {
      const totalFavorites = await this.favoriteRepository.count();

      // Favorites by content type
      const movieFavorites = await this.favoriteRepository.count({
        where: { contentType: "movie" },
      });

      const tvFavorites = await this.favoriteRepository.count({
        where: { contentType: "tv" },
      });

      // Most favorited content
      const mostFavorited = await this.favoriteRepository
        .createQueryBuilder("favorite")
        .select("favorite.contentId", "contentId")
        .addSelect("favorite.contentType", "contentType")
        .addSelect("COUNT(*)", "favoriteCount")
        .groupBy("favorite.contentId, favorite.contentType")
        .orderBy("COUNT(*)", "DESC")
        .limit(20)
        .getRawMany();

      // Fetch titles for favorited content
      const movieIds = mostFavorited
        .filter(f => f.contentType === "movie")
        .map(f => parseInt(f.contentId));
      
      const tvIds = mostFavorited
        .filter(f => f.contentType === "tv")
        .map(f => parseInt(f.contentId));

      const [movieTitles, tvTitles] = await Promise.all([
        movieIds.length > 0
          ? this.movieRepository
              .createQueryBuilder("movie")
              .select(["movie.tmdbId", "movie.title", "movie.posterPath"])
              .where("movie.tmdbId IN (:...ids)", { ids: movieIds })
              .getMany()
          : [],
        tvIds.length > 0
          ? this.tvRepository
              .createQueryBuilder("tv")
              .select(["tv.tmdbId", "tv.title", "tv.posterPath"])
              .where("tv.tmdbId IN (:...ids)", { ids: tvIds })
              .getMany()
          : [],
      ]);

      // Create lookup maps
      const movieTitleMap = new Map<number, { title: string; posterPath: string | null }>();
      movieTitles.forEach(m => {
        movieTitleMap.set(m.tmdbId, { title: m.title, posterPath: m.posterPath });
      });

      const tvTitleMap = new Map<number, { title: string; posterPath: string | null }>();
      tvTitles.forEach(tv => {
        tvTitleMap.set(tv.tmdbId, { title: tv.title, posterPath: tv.posterPath });
      });

      // Favorites over time (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const favoritesOverTime = await this.favoriteRepository
        .createQueryBuilder("favorite")
        .select("DATE(favorite.createdAt)", "date")
        .addSelect("COUNT(*)", "count")
        .where("favorite.createdAt >= :startDate", {
          startDate: thirtyDaysAgo,
        })
        .groupBy("DATE(favorite.createdAt)")
        .orderBy("DATE(favorite.createdAt)", "ASC")
        .getRawMany();

      return {
        total: totalFavorites,
        byType: {
          movies: movieFavorites,
          tvSeries: tvFavorites,
        },
        mostFavorited: mostFavorited.map((f) => {
          const tmdbId = parseInt(f.contentId);
          const titleData = f.contentType === "movie" 
            ? movieTitleMap.get(tmdbId)
            : tvTitleMap.get(tmdbId);
          
          return {
            contentId: f.contentId,
            contentType: f.contentType,
            count: parseInt(f.favoriteCount),
            title: titleData ? titleData.title : "Unknown",
            posterPath: titleData ? titleData.posterPath : null,
          };
        }),
        trend: favoritesOverTime.map((f) => ({
          date: f.date,
          count: parseInt(f.count),
        })),
      };
    } catch (error) {
      this.logger.error("Error getting favorite stats:", error);
      throw error;
    }
  }

  // Get popular content (combination of views, clicks, favorites)
  async getPopularContent(limit: number = 20) {
    try {
      // Get content with most views
      const movies = await this.movieRepository.find({
        where: { isBlocked: false },
        order: { viewCount: "DESC" },
        take: limit,
      });

      const tvSeries = await this.tvRepository.find({
        where: { isBlocked: false },
        order: { viewCount: "DESC" },
        take: limit,
      });

      // Get favorite counts for each content
      const movieFavCounts = await Promise.all(
        movies.map(async (m) => {
          const count = await this.favoriteRepository.count({
            where: { contentId: String(m.tmdbId), contentType: "movie" },
          });
          return { tmdbId: m.tmdbId, favoriteCount: count };
        })
      );

      const tvFavCounts = await Promise.all(
        tvSeries.map(async (tv) => {
          const count = await this.favoriteRepository.count({
            where: { contentId: String(tv.tmdbId), contentType: "tv" },
          });
          return { tmdbId: tv.tmdbId, favoriteCount: count };
        })
      );

      // Create lookup maps
      const movieFavMap = new Map(movieFavCounts.map(f => [f.tmdbId, f.favoriteCount]));
      const tvFavMap = new Map(tvFavCounts.map(f => [f.tmdbId, f.favoriteCount]));

      // Combine all results into a single array with proper field names
      const allContent = [
        ...movies.map((m) => ({
          tmdbId: m.tmdbId,
          title: m.title,
          contentType: "movie" as const,
          viewCount: m.viewCount || 0,
          clickCount: m.clickCount || 0,
          favoriteCount: movieFavMap.get(m.tmdbId) || 0,
          posterPath: m.posterPath || null,
        })),
        ...tvSeries.map((tv) => ({
          tmdbId: tv.tmdbId,
          title: tv.title,
          contentType: "tv" as const,
          viewCount: tv.viewCount || 0,
          clickCount: tv.clickCount || 0,
          favoriteCount: tvFavMap.get(tv.tmdbId) || 0,
          posterPath: tv.posterPath || null,
        })),
      ];

      // Sort by viewCount and return top items
      return allContent
        .sort((a, b) => b.viewCount - a.viewCount)
        .slice(0, limit);
    } catch (error) {
      this.logger.error("Error getting popular content:", error);
      throw error;
    }
  }

  // Get analytics overview
  async getAnalyticsOverview() {
    try {
      const [viewStats, favoriteStats, popularContent] = await Promise.all([
        this.getViewStats(),
        this.getFavoriteStats(),
        this.getPopularContent(10),
      ]);

      return {
        views: viewStats,
        favorites: favoriteStats,
        popularContent,
      };
    } catch (error) {
      this.logger.error("Error getting analytics overview:", error);
      throw error;
    }
  }

  // Get device/browser statistics
  async getDeviceStats() {
    try {
      const deviceStats = await this.viewAnalyticsRepository
        .createQueryBuilder("analytics")
        .select("analytics.deviceType", "deviceType")
        .addSelect("COUNT(*)", "count")
        .where("analytics.deviceType IS NOT NULL")
        .groupBy("analytics.deviceType")
        .getRawMany();

      return deviceStats.map((d) => ({
        device: d.deviceType,
        count: parseInt(d.count),
      }));
    } catch (error) {
      this.logger.error("Error getting device stats:", error);
      throw error;
    }
  }

  // Get country statistics
  async getCountryStats() {
    try {
      const countryStats = await this.viewAnalyticsRepository
        .createQueryBuilder("analytics")
        .select("analytics.country", "country")
        .addSelect("COUNT(*)", "count")
        .where("analytics.country IS NOT NULL")
        .groupBy("analytics.country")
        .orderBy("COUNT(*)", "DESC")
        .limit(20)
        .getRawMany();

      return countryStats.map((c) => ({
        country: c.country,
        count: parseInt(c.count),
      }));
    } catch (error) {
      this.logger.error("Error getting country stats:", error);
      throw error;
    }
  }
}
