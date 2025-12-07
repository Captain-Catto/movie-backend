import { Injectable } from "@nestjs/common";
import { RecentSearchRepository } from "../repositories/recent-search.repository";
import { RecentSearch } from "../entities/recent-search.entity";

@Injectable()
export class RecentSearchService {
  constructor(private recentSearchRepository: RecentSearchRepository) {}

  async getRecentSearches(
    userId: number,
    limit: number = 10
  ): Promise<RecentSearch[]> {
    return this.recentSearchRepository.findByUserId(userId, limit);
  }

  async saveSearch(
    userId: number,
    query: string,
    type: "movie" | "tv" | "all" = "all"
  ): Promise<RecentSearch> {
    // Clean up old searches (keep only 20 most recent)
    await this.recentSearchRepository.deleteOldSearches(userId, 20);

    return this.recentSearchRepository.create({
      userId,
      query: query.trim(),
      type,
    });
  }

  async clearUserSearches(userId: number): Promise<void> {
    await this.recentSearchRepository.deleteByUserId(userId);
  }

  async deleteSearch(userId: number, searchId: number): Promise<void> {
    await this.recentSearchRepository.deleteById(searchId, userId);
  }
}
