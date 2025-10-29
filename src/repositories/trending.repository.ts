import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Trending, MediaType } from "../entities/trending.entity";

@Injectable()
export class TrendingRepository {
  constructor(
    @InjectRepository(Trending)
    private repository: Repository<Trending>
  ) {}

  async findAll(
    page: number = 1,
    limit: number = 24,
    includeHidden: boolean = false
  ): Promise<{
    data: Trending[];
    total: number;
  }> {
    const [data, total] = await this.repository.findAndCount({
      where: includeHidden
        ? {}
        : {
            isHidden: false,
          },
      order: { popularity: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async findByTmdbIdAndType(
    tmdbId: number,
    mediaType: MediaType
  ): Promise<Trending> {
    return this.repository.findOne({
      where: { tmdbId, mediaType },
    });
  }

  async create(trendingData: Partial<Trending>): Promise<Trending> {
    const trending = this.repository.create(trendingData);
    return this.repository.save(trending);
  }

  async update(id: number, trendingData: Partial<Trending>): Promise<Trending> {
    await this.repository.update(id, trendingData);
    return this.repository.findOne({ where: { id } });
  }

  async upsertByTmdbIdAndType(
    tmdbId: number,
    mediaType: MediaType,
    trendingData: Partial<Trending>
  ): Promise<Trending> {
    const existingTrending = await this.findByTmdbIdAndType(tmdbId, mediaType);

    if (existingTrending) {
      return this.update(existingTrending.id, trendingData);
    } else {
      return this.create({ ...trendingData, tmdbId, mediaType });
    }
  }

  async clearAll(): Promise<void> {
    await this.repository.clear();
  }

  async setHiddenStatus(
    tmdbId: number,
    mediaType: MediaType,
    isHidden: boolean,
    reason?: string
  ): Promise<void> {
    const result = await this.repository.update(
      { tmdbId, mediaType },
      {
        isHidden,
        hiddenReason: isHidden ? reason ?? null : null,
        hiddenAt: isHidden ? new Date() : null,
      }
    );

    if (!result.affected) {
      throw new Error(
        `Trending item not found for tmdbId=${tmdbId} mediaType=${mediaType}`
      );
    }
  }
}
