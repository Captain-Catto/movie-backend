import { Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { RecentSearch } from "../entities/recent-search.entity";

@Injectable()
export class RecentSearchRepository {
  constructor(
    @InjectRepository(RecentSearch)
    private repository: Repository<RecentSearch>
  ) {}

  async findByUserId(
    userId: number,
    limit: number = 10
  ): Promise<RecentSearch[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  async create(data: Partial<RecentSearch>): Promise<RecentSearch> {
    // Check if search already exists for this user
    if (data.userId) {
      const existing = await this.repository.findOne({
        where: {
          userId: data.userId,
          query: data.query,
          type: data.type,
        },
      });

      if (existing) {
        // Update timestamp
        existing.updatedAt = new Date();
        return this.repository.save(existing);
      }
    }

    // Create new search record
    const recentSearch = this.repository.create(data);
    return this.repository.save(recentSearch);
  }

  async deleteByUserId(userId: number): Promise<void> {
    await this.repository.delete({ userId });
  }

  async deleteById(id: number, userId: number): Promise<void> {
    // Delete only if it belongs to the user (security check)
    await this.repository.delete({ id, userId });
  }

  async deleteOldSearches(
    userId: number,
    keepCount: number = 20
  ): Promise<void> {
    const searches = await this.repository.find({
      where: { userId },
      order: { createdAt: "DESC" },
      skip: keepCount,
    });

    if (searches.length > 0) {
      const idsToDelete = searches.map((s) => s.id);
      await this.repository.delete(idsToDelete);
    }
  }
}
