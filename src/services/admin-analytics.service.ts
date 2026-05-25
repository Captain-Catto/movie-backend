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
    this.logger.debug(`[Analytics] getViewStats called with: startDate=${startDate}, endDate=${endDate}, contentType=${contentType}`);

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
      this.logger.debug(`[Analytics] getViewStats result: ${totalViews} views`);

      // Views by content type (with active date range filter)
      const movieQueryBuilder = this.viewAnalyticsRepository
        .createQueryBuilder("analytics")
        .where("analytics.actionType = :action", { action: ActionType.VIEW })
        .andWhere("analytics.contentType = :contentType", { contentType: ViewContentType.MOVIE });

      const tvQueryBuilder = this.viewAnalyticsRepository
        .createQueryBuilder("analytics")
        .where("analytics.actionType = :action", { action: ActionType.VIEW })
        .andWhere("analytics.contentType = :contentType", { contentType: ViewContentType.TV_SERIES });

      if (startDate) {
        movieQueryBuilder.andWhere("analytics.createdAt >= :startDate", { startDate });
        tvQueryBuilder.andWhere("analytics.createdAt >= :startDate", { startDate });
      }
      if (endDate) {
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        movieQueryBuilder.andWhere("analytics.createdAt < :endDate", { endDate: nextDay });
        tvQueryBuilder.andWhere("analytics.createdAt < :endDate", { endDate: nextDay });
      }

      const movieViews = await movieQueryBuilder.getCount();
      const tvViews = await tvQueryBuilder.getCount();

      // Get views over time (within selected date range or fallback to last 30 days)
      const trendQueryBuilder = this.viewAnalyticsRepository
        .createQueryBuilder("analytics")
        .select("DATE(analytics.createdAt)", "date")
        .addSelect("COUNT(*)", "count")
        .where("analytics.actionType = :action", { action: ActionType.VIEW });

      if (startDate) {
        trendQueryBuilder.andWhere("analytics.createdAt >= :startDate", { startDate });
      } else {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        trendQueryBuilder.andWhere("analytics.createdAt >= :startDate", { startDate: thirtyDaysAgo });
      }

      if (endDate) {
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        trendQueryBuilder.andWhere("analytics.createdAt < :endDate", { endDate: nextDay });
      }

      if (contentType) {
        trendQueryBuilder.andWhere("analytics.contentType = :contentType", { contentType });
      }

      const viewsOverTime = await trendQueryBuilder
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

  // Get most viewed content with robust date range filtering
  async getMostViewedContent(
    limit: number = 20,
    contentType?: ViewContentType,
    startDate?: string | Date,
    endDate?: string | Date
  ) {
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

      if (startDate) {
        queryBuilder.andWhere("analytics.createdAt >= :startDate", { startDate });
      }

      if (endDate) {
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        queryBuilder.andWhere("analytics.createdAt < :endDate", { endDate: nextDay });
      }

      const results = await queryBuilder
        .groupBy("analytics.contentId, analytics.contentType, analytics.contentTitle")
        .orderBy("COUNT(*)", "DESC")
        .limit(limit)
        .getRawMany();

      // Fetch poster paths from movies and tv_series tables
      const movieIds = results
        .filter(r => r.contentType === ViewContentType.MOVIE)
        .map(r => parseInt(r.contentId));

      const tvIds = results
        .filter(r => r.contentType === ViewContentType.TV_SERIES)
        .map(r => parseInt(r.contentId));

      const [moviePosters, tvPosters] = await Promise.all([
        movieIds.length > 0
          ? this.movieRepository
              .createQueryBuilder("movie")
              .select(["movie.tmdbId", "movie.posterPath"])
              .where("movie.tmdbId IN (:...ids)", { ids: movieIds })
              .getMany()
          : [],
        tvIds.length > 0
          ? this.tvRepository
              .createQueryBuilder("tv")
              .select(["tv.tmdbId", "tv.posterPath"])
              .where("tv.tmdbId IN (:...ids)", { ids: tvIds })
              .getMany()
          : [],
      ]);

      // Create lookup maps
      const moviePosterMap = new Map<number, string | null>();
      moviePosters.forEach(m => {
        moviePosterMap.set(m.tmdbId, m.posterPath);
      });

      const tvPosterMap = new Map<number, string | null>();
      tvPosters.forEach(tv => {
        tvPosterMap.set(tv.tmdbId, tv.posterPath);
      });

      // Fetch metadata poster fallback for items missing in DB
      const missingIds = results
        .filter((r) => {
          const tmdbId = parseInt(r.contentId);
          const hasPoster =
            (r.contentType === ViewContentType.MOVIE
              ? moviePosterMap.get(tmdbId)
              : tvPosterMap.get(tmdbId)) || null;
          return !hasPoster;
        })
        .map((r) => r.contentId);

      const metadataPosterMap = new Map<string, string | null>();
      if (missingIds.length > 0) {
        const rawMeta = await this.viewAnalyticsRepository
          .createQueryBuilder("analytics")
          .distinctOn(["analytics.contentId", "analytics.contentType"])
          .select([
            "analytics.contentId as contentId",
            "analytics.contentType as contentType",
            "analytics.metadata as metadata",
          ])
          .where("analytics.actionType = :action", { action: ActionType.VIEW })
          .andWhere("analytics.contentId IN (:...ids)", { ids: missingIds })
          .orderBy("analytics.contentId")
          .addOrderBy("analytics.createdAt", "DESC")
          .getRawMany();

        rawMeta.forEach((row) => {
          const key = `${row.contentType}:${row.contentId}`;
          let poster: string | null = null;
          const meta =
            typeof row.metadata === "string"
              ? (() => {
                  try {
                    return JSON.parse(row.metadata);
                  } catch {
                    return {};
                  }
                })()
              : row.metadata || {};
          poster =
            meta?.posterPath ||
            meta?.poster_path ||
            meta?.posterURL ||
            meta?.posterUrl ||
            null;
          metadataPosterMap.set(key, poster);
        });
      }

      return results.map((r) => {
        const tmdbId = parseInt(r.contentId);
        const posterPath =
          r.contentType === ViewContentType.MOVIE
            ? moviePosterMap.get(tmdbId)
            : tvPosterMap.get(tmdbId);
        const fallbackKey = `${r.contentType}:${r.contentId}`;
        const fallbackPoster = metadataPosterMap.get(fallbackKey) || null;

        return {
          contentId: r.contentId,
          contentType: r.contentType,
          title: r.title,
          viewCount: parseInt(r.viewCount),
          posterPath: posterPath || fallbackPoster,
        };
      });
    } catch (error) {
      this.logger.error("Error getting most viewed content:", error);
      throw error;
    }
  }

  // Get click statistics
  async getClickStats(query: AnalyticsQuery = {}) {
    const { startDate, endDate, contentType } = query;

    // Debug logging
    this.logger.debug(`[Analytics] getClickStats called with: startDate=${startDate}, endDate=${endDate}, contentType=${contentType}`);

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
      this.logger.debug(`[Analytics] getClickStats result: ${totalClicks} clicks`);

      return {
        total: totalClicks,
      };
    } catch (error) {
      this.logger.error("Error getting click stats:", error);
      throw error;
    }
  }

  // Get play statistics with active timeframe breakdown
  async getPlayStats(query: AnalyticsQuery = {}) {
    const { startDate, endDate, contentType } = query;

    // Debug logging
    this.logger.debug(`[Analytics] getPlayStats called with: startDate=${startDate}, endDate=${endDate}, contentType=${contentType}`);

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

      // Breakdown by metadata.source (with active date range filter applied)
      const breakdownQueryBuilder = this.viewAnalyticsRepository
        .createQueryBuilder("analytics")
        .select("COALESCE(analytics.metadata->>'source', 'unknown')", "source")
        .addSelect("COUNT(*)", "count")
        .where("analytics.actionType = :action", { action: ActionType.PLAY });

      if (startDate) {
        breakdownQueryBuilder.andWhere("analytics.createdAt >= :startDate", { startDate });
      }
      if (endDate) {
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        breakdownQueryBuilder.andWhere("analytics.createdAt < :endDate", { endDate: nextDay });
      }
      if (contentType) {
        breakdownQueryBuilder.andWhere("analytics.contentType = :contentType", { contentType });
      }

      const sourceBreakdownRaw = await breakdownQueryBuilder
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

      this.logger.debug(`[Analytics] getPlayStats result: ${totalPlays} plays`);

      return {
        total: totalPlays,
        bySource,
      };
    } catch (error) {
      this.logger.error("Error getting play stats:", error);
      throw error;
    }
  }

  // Get favorite statistics with active timeframe filters
  async getFavoriteStats(
    contentType?: ViewContentType,
    startDate?: string | Date,
    endDate?: string | Date
  ) {
    try {
      const whereContent =
        contentType === ViewContentType.TV_SERIES
          ? "tv"
          : contentType === ViewContentType.MOVIE
          ? "movie"
          : undefined;

      // Filter favorites by date range
      const totalFavQuery = this.favoriteRepository.createQueryBuilder("favorite");
      if (whereContent) {
        totalFavQuery.where("favorite.contentType = :ctype", { ctype: whereContent });
      }
      if (startDate) {
        totalFavQuery.andWhere("favorite.createdAt >= :startDate", { startDate });
      }
      if (endDate) {
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        totalFavQuery.andWhere("favorite.createdAt < :endDate", { endDate: nextDay });
      }
      const totalFavorites = await totalFavQuery.getCount();

      // Favorites by content type (with active date range filter)
      const movieFavQuery = this.favoriteRepository
        .createQueryBuilder("favorite")
        .where("favorite.contentType = :ctype", { ctype: "movie" });
      const tvFavQuery = this.favoriteRepository
        .createQueryBuilder("favorite")
        .where("favorite.contentType = :ctype", { ctype: "tv" });

      if (startDate) {
        movieFavQuery.andWhere("favorite.createdAt >= :startDate", { startDate });
        tvFavQuery.andWhere("favorite.createdAt >= :startDate", { startDate });
      }
      if (endDate) {
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        movieFavQuery.andWhere("favorite.createdAt < :endDate", { endDate: nextDay });
        tvFavQuery.andWhere("favorite.createdAt < :endDate", { endDate: nextDay });
      }

      const movieFavorites = await movieFavQuery.getCount();
      const tvFavorites = await tvFavQuery.getCount();

      // Most favorited content (with active date range filter)
      const mostFavoritedQuery = this.favoriteRepository
        .createQueryBuilder("favorite")
        .select("favorite.contentId", "contentId")
        .addSelect("favorite.contentType", "contentType")
        .addSelect("COUNT(*)", "favoriteCount");

      if (whereContent) {
        mostFavoritedQuery.where("favorite.contentType = :ctype", {
          ctype: whereContent,
        });
      }

      if (startDate) {
        mostFavoritedQuery.andWhere("favorite.createdAt >= :startDate", { startDate });
      }
      if (endDate) {
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        mostFavoritedQuery.andWhere("favorite.createdAt < :endDate", { endDate: nextDay });
      }

      const mostFavorited = await mostFavoritedQuery
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

      // Favorites over time (within selected date range or fallback to last 30 days)
      const favoritesOverTimeBuilder = this.favoriteRepository
        .createQueryBuilder("favorite")
        .select("DATE(favorite.createdAt)", "date")
        .addSelect("COUNT(*)", "count");

      if (startDate) {
        favoritesOverTimeBuilder.where("favorite.createdAt >= :startDate", { startDate });
      } else {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        favoritesOverTimeBuilder.where("favorite.createdAt >= :startDate", { startDate: thirtyDaysAgo });
      }

      if (endDate) {
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        favoritesOverTimeBuilder.andWhere("favorite.createdAt < :endDate", { endDate: nextDay });
      }

      if (whereContent) {
        favoritesOverTimeBuilder.andWhere("favorite.contentType = :ctype", {
          ctype: whereContent,
        });
      }

      const favoritesOverTime = await favoritesOverTimeBuilder
        .groupBy("DATE(favorite.createdAt)")
        .orderBy("DATE(favorite.createdAt)", "ASC")
        .getRawMany();

      return {
        total: totalFavorites,
        byType: {
          movies: movieFavorites,
          tvSeries: tvFavorites,
        },
        mostFavorited: mostFavorited
          .map((f) => {
            const tmdbId = parseInt(f.contentId);
            const titleData = f.contentType === "movie" 
              ? movieTitleMap.get(tmdbId)
              : tvTitleMap.get(tmdbId);
            
            if (!titleData) return null;
            
            return {
              contentId: f.contentId,
              contentType: f.contentType,
              count: parseInt(f.favoriteCount),
              title: titleData.title,
              posterPath: titleData.posterPath,
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null),
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
  async getPopularContent(
    limit: number = 20,
    startDate?: string | Date,
    endDate?: string | Date,
    contentType?: ViewContentType
  ) {
    try {
      // 1. Get most viewed content in this timeframe from events
      let viewResults: any[] = [];
      
      if (startDate || endDate || contentType) {
        // Try querying the event database if createQueryBuilder is fully mockable/available
        try {
          const viewsQuery = this.viewAnalyticsRepository
            .createQueryBuilder("analytics")
            .select("analytics.contentId", "contentId")
            .addSelect("analytics.contentType", "contentType")
            .addSelect("analytics.contentTitle", "title")
            .addSelect("COUNT(*)", "viewCount")
            .where("analytics.actionType = :action", { action: ActionType.VIEW });

          if (startDate) {
            viewsQuery.andWhere("analytics.createdAt >= :startDate", { startDate });
          }
          if (endDate) {
            const nextDay = new Date(endDate);
            nextDay.setDate(nextDay.getDate() + 1);
            viewsQuery.andWhere("analytics.createdAt < :endDate", { endDate: nextDay });
          }
          if (contentType) {
            viewsQuery.andWhere("analytics.contentType = :contentType", { contentType });
          }

          viewResults = await viewsQuery
            .groupBy("analytics.contentId, analytics.contentType, analytics.contentTitle")
            .orderBy("COUNT(*)", "DESC")
            .limit(limit)
            .getRawMany();
        } catch (dbError) {
          this.logger.warn(`Failed to aggregate popular content dynamically: ${dbError.message}. Falling back to static table statistics.`);
          viewResults = [];
        }
      }

      // If no dynamic view events are found (or query failed), fallback to static aggregate tables
      if (!viewResults || viewResults.length === 0) {
        if (contentType === ViewContentType.MOVIE) {
          const movieQuery = this.movieRepository.createQueryBuilder("movie")
            .where("movie.isBlocked = :isBlocked", { isBlocked: false });
          const movies = await movieQuery.orderBy("movie.viewCount", "DESC").limit(limit).getMany();
          const movieFavCounts = await Promise.all(
            movies.map(async (m) => {
              const count = await this.favoriteRepository.count({
                where: { contentId: String(m.tmdbId), contentType: "movie" },
              });
              return { tmdbId: m.tmdbId, favoriteCount: count };
            })
          );
          const movieFavMap = new Map(movieFavCounts.map(f => [f.tmdbId, f.favoriteCount]));
          return movies.map(m => ({
            tmdbId: m.tmdbId,
            title: m.title,
            contentType: "movie" as const,
            viewCount: m.viewCount || 0,
            clickCount: m.clickCount || 0,
            favoriteCount: movieFavMap.get(m.tmdbId) || 0,
            posterPath: m.posterPath || null,
          }));
        } else if (contentType === ViewContentType.TV_SERIES) {
          const tvQuery = this.tvRepository.createQueryBuilder("tv")
            .where("tv.isBlocked = :isBlocked", { isBlocked: false });
          const tvs = await tvQuery.orderBy("tv.viewCount", "DESC").limit(limit).getMany();
          const tvFavCounts = await Promise.all(
            tvs.map(async (tv) => {
              const count = await this.favoriteRepository.count({
                where: { contentId: String(tv.tmdbId), contentType: "tv" },
              });
              return { tmdbId: tv.tmdbId, favoriteCount: count };
            })
          );
          const tvFavMap = new Map(tvFavCounts.map(f => [f.tmdbId, f.favoriteCount]));
          return tvs.map(tv => ({
            tmdbId: tv.tmdbId,
            title: tv.title,
            contentType: "tv" as const,
            viewCount: tv.viewCount || 0,
            clickCount: tv.clickCount || 0,
            favoriteCount: tvFavMap.get(tv.tmdbId) || 0,
            posterPath: tv.posterPath || null,
          }));
        } else {
          // Standard combined path (default behavior before)
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

          const movieFavMap = new Map(movieFavCounts.map(f => [f.tmdbId, f.favoriteCount]));
          const tvFavMap = new Map(tvFavCounts.map(f => [f.tmdbId, f.favoriteCount]));

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

          return allContent
            .sort((a, b) => b.viewCount - a.viewCount)
            .slice(0, limit);
        }
      }

      // If we have viewResults in the timeframe:
      // Aggregate clickCount and favoriteCount for the viewResults within the same date range
      const contentIds = viewResults.map(r => String(r.contentId));
      
      // Fetch clicks for these contentIds in the timeframe
      const clicksQuery = this.viewAnalyticsRepository
        .createQueryBuilder("analytics")
        .select("analytics.contentId", "contentId")
        .addSelect("analytics.contentType", "contentType")
        .addSelect("COUNT(*)", "clickCount")
        .where("analytics.actionType = :action", { action: ActionType.CLICK })
        .andWhere("analytics.contentId IN (:...contentIds)", { contentIds });

      if (startDate) {
        clicksQuery.andWhere("analytics.createdAt >= :startDate", { startDate });
      }
      if (endDate) {
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        clicksQuery.andWhere("analytics.createdAt < :endDate", { endDate: nextDay });
      }
      const clickResults = await clicksQuery
        .groupBy("analytics.contentId, analytics.contentType")
        .getRawMany();

      const clickMap = new Map<string, number>();
      clickResults.forEach(c => {
        clickMap.set(`${c.contentType}:${c.contentId}`, parseInt(c.clickCount));
      });

      // Fetch favorites for these contentIds in the timeframe
      const favQuery = this.favoriteRepository
        .createQueryBuilder("favorite")
        .select("favorite.contentId", "contentId")
        .addSelect("favorite.contentType", "contentType")
        .addSelect("COUNT(*)", "favoriteCount")
        .where("favorite.contentId IN (:...contentIds)", { contentIds });

      if (startDate) {
        favQuery.andWhere("favorite.createdAt >= :startDate", { startDate });
      }
      if (endDate) {
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        favQuery.andWhere("favorite.createdAt < :endDate", { endDate: nextDay });
      }
      const favResults = await favQuery
        .groupBy("favorite.contentId, favorite.contentType")
        .getRawMany();

      const favMap = new Map<string, number>();
      favResults.forEach(f => {
        // Map favorite.contentType ('movie' or 'tv') to viewAnalytics.contentType ('movie' or 'tv_series')
        const mappedType = f.contentType === "tv" ? ViewContentType.TV_SERIES : ViewContentType.MOVIE;
        favMap.set(`${mappedType}:${f.contentId}`, parseInt(f.favoriteCount));
      });

      // Fetch poster paths for these items
      const movieIds = viewResults
        .filter(r => r.contentType === ViewContentType.MOVIE)
        .map(r => parseInt(r.contentId));
      const tvIds = viewResults
        .filter(r => r.contentType === ViewContentType.TV_SERIES)
        .map(r => parseInt(r.contentId));

      const [moviePosters, tvPosters] = await Promise.all([
        movieIds.length > 0
          ? this.movieRepository
              .createQueryBuilder("movie")
              .select(["movie.tmdbId", "movie.posterPath"])
              .where("movie.tmdbId IN (:...ids)", { ids: movieIds })
              .getMany()
          : [],
        tvIds.length > 0
          ? this.tvRepository
              .createQueryBuilder("tv")
              .select(["tv.tmdbId", "tv.posterPath"])
              .where("tv.tmdbId IN (:...ids)", { ids: tvIds })
              .getMany()
          : [],
      ]);

      const moviePosterMap = new Map<number, string | null>();
      moviePosters.forEach(m => {
        moviePosterMap.set(m.tmdbId, m.posterPath);
      });

      const tvPosterMap = new Map<number, string | null>();
      tvPosters.forEach(tv => {
        tvPosterMap.set(tv.tmdbId, tv.posterPath);
      });

      return viewResults.map((r) => {
        const tmdbId = parseInt(r.contentId);
        const mapKey = `${r.contentType}:${r.contentId}`;
        const posterPath = r.contentType === ViewContentType.MOVIE
          ? moviePosterMap.get(tmdbId)
          : tvPosterMap.get(tmdbId);

        return {
          tmdbId,
          title: r.title,
          contentType: r.contentType === ViewContentType.TV_SERIES ? ("tv" as const) : ("movie" as const),
          viewCount: parseInt(r.viewCount) || 0,
          clickCount: clickMap.get(mapKey) || 0,
          favoriteCount: favMap.get(mapKey) || 0,
          posterPath: posterPath || null,
        };
      });
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

  // Get device/browser statistics with active date range filter
  async getDeviceStats(
    startDate?: string | Date,
    endDate?: string | Date,
    contentType?: ViewContentType
  ) {
    try {
      const queryBuilder = this.viewAnalyticsRepository
        .createQueryBuilder("analytics")
        .select("analytics.deviceType", "deviceType")
        .addSelect("COUNT(*)", "count")
        .where("analytics.deviceType IS NOT NULL");

      if (startDate) {
        queryBuilder.andWhere("analytics.createdAt >= :startDate", { startDate });
      }

      if (endDate) {
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        queryBuilder.andWhere("analytics.createdAt < :endDate", { endDate: nextDay });
      }

      if (contentType) {
        queryBuilder.andWhere("analytics.contentType = :contentType", { contentType });
      }

      const deviceStats = await queryBuilder
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

  // Get country statistics with active date range filter
  async getCountryStats(
    startDate?: string | Date,
    endDate?: string | Date,
    contentType?: ViewContentType
  ) {
    try {
      const queryBuilder = this.viewAnalyticsRepository
        .createQueryBuilder("analytics")
        .select("analytics.country", "country")
        .addSelect("COUNT(*)", "count")
        .where("analytics.country IS NOT NULL");

      if (startDate) {
        queryBuilder.andWhere("analytics.createdAt >= :startDate", { startDate });
      }

      if (endDate) {
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        queryBuilder.andWhere("analytics.createdAt < :endDate", { endDate: nextDay });
      }

      if (contentType) {
        queryBuilder.andWhere("analytics.contentType = :contentType", { contentType });
      }

      const countryStats = await queryBuilder
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
