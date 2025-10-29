import { Injectable } from "@nestjs/common";
import {
  FavoriteRepository,
  FavoriteOptions,
} from "../repositories/favorite.repository";

@Injectable()
export class FavoriteService {
  constructor(private readonly favoriteRepository: FavoriteRepository) {}

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

    return this.favoriteRepository.create({
      userId,
      contentId,
      contentType,
      updatedAt: new Date(),
      user: null, // Will be set by the repository
    });
  }

  async removeFromFavorites(
    userId: number,
    contentId: string,
    contentType: "movie" | "tv"
  ) {
    return this.favoriteRepository.delete(userId, contentId, contentType);
  }
}
