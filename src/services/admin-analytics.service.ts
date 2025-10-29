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
  startDate?: Date;
  endDate?: Date;
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
        queryBuilder.andWhere("analytics.createdAt <= :endDate", { endDate });
      }

      if (contentType) {
        queryBuilder.andWhere("analytics.contentType = :contentType", {
          contentType,
        });
      }

      const totalViews = await queryBuilder.getCount();

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
        queryBuilder.andWhere("analytics.createdAt <= :endDate", { endDate });
      }

      if (contentType) {
        queryBuilder.andWhere("analytics.contentType = :contentType", {
          contentType,
        });
      }

      const totalClicks = await queryBuilder.getCount();

      return {
        total: totalClicks,
      };
    } catch (error) {
      this.logger.error("Error getting click stats:", error);
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
        mostFavorited: mostFavorited.map((f) => ({
          contentId: f.contentId,
          contentType: f.contentType,
          count: parseInt(f.favoriteCount),
        })),
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

      return {
        movies: movies.map((m) => ({
          id: m.tmdbId,
          title: m.title,
          viewCount: m.viewCount,
          clickCount: m.clickCount,
          type: "movie",
        })),
        tvSeries: tvSeries.map((tv) => ({
          id: tv.tmdbId,
          title: tv.title,
          viewCount: tv.viewCount,
          clickCount: tv.clickCount,
          type: "tv",
        })),
      };
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
