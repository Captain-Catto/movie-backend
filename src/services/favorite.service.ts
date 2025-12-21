import { Injectable } from "@nestjs/common";
import {
  FavoriteRepository,
  FavoriteOptions,
} from "../repositories/favorite.repository";
import { AdminAnalyticsRealtimeService } from "./admin-analytics-realtime.service";

@Injectable()
export class FavoriteService {
  constructor(
    private readonly favoriteRepository: FavoriteRepository,
    private readonly analyticsRealtime: AdminAnalyticsRealtimeService
  ) {}

  async getUserFavorites(userId: number, options: FavoriteOptions) {
    const result = await this.favoriteRepository.findByUserId(userId, options);

    return {
      favorites: result.data,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      hasMore: result.hasMore,
    };
  }

  async addToFavorites(
    userId: number,
    contentId: string,
    contentType: "movie" | "tv"
  ) {
    // Check if already exists
    const existing = await this.favoriteRepository.findByUserAndContent(
      userId,
      contentId,
      contentType
    );

    if (existing) {
      throw new Error("Item already in favorites");
    }

    const created = await this.favoriteRepository.create({
      userId,
      contentId,
      contentType,
      updatedAt: new Date(),
      user: null, // Will be set by the repository
    });

    // Best-effort realtime push for admin dashboard
    this.analyticsRealtime.trackFavoriteDelta(1).catch(() => undefined);

    return created;
  }

  async removeFromFavorites(
    userId: number,
    contentId: string,
    contentType: "movie" | "tv"
  ) {
    const result = await this.favoriteRepository.delete(
      userId,
      contentId,
      contentType
    );

    if (result?.affected && result.affected > 0) {
      this.analyticsRealtime.trackFavoriteDelta(-1).catch(() => undefined);
    }

    return result;
  }

  /**
   * Get only favorite IDs for a user - lightweight for initial load
   */
  async getUserFavoriteIds(userId: number) {
    return this.favoriteRepository.findIdsByUserId(userId);
  }

  /**
   * Check if specific item is favorited by user
   */
  async checkIsFavorite(
    userId: number,
    contentId: string,
    contentType: "movie" | "tv"
  ): Promise<boolean> {
    return this.favoriteRepository.checkExists(userId, contentId, contentType);
  }
}
