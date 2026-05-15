import { IsNull, Repository } from "typeorm";
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
      where: { userId, dismissedAt: IsNull() },
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
        // Update timestamp and restore if the user previously dismissed it.
        existing.updatedAt = new Date();
        existing.dismissedAt = null;
        return this.repository.save(existing);
      }
    }

    // Create new search record
    const recentSearch = this.repository.create(data);
    return this.repository.save(recentSearch);
  }

  async deleteByUserId(userId: number): Promise<void> {
    await this.repository.update(
      { userId, dismissedAt: IsNull() },
      { dismissedAt: new Date() }
    );
  }

  async deleteById(id: number, userId: number): Promise<void> {
    // Dismiss only if it belongs to the user (security check).
    await this.repository.update({ id, userId }, { dismissedAt: new Date() });
  }

  async deleteOldSearches(
    userId: number,
    keepCount: number = 20
  ): Promise<void> {
    const searches = await this.repository.find({
      where: { userId, dismissedAt: IsNull() },
      order: { createdAt: "DESC" },
      skip: keepCount,
    });

    if (searches.length > 0) {
      const idsToDelete = searches.map((s) => s.id);
      await this.repository.update(idsToDelete, { dismissedAt: new Date() });
    }
  }
}
