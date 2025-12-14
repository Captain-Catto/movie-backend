import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, ILike, Brackets } from "typeorm";
import { TVSeries } from "../entities/tv-series.entity";
import { PaginatedResult } from "../interfaces/api.interface";

@Injectable()
export class TVSeriesRepository {
  constructor(
    @InjectRepository(TVSeries)
    private repository: Repository<TVSeries>
  ) {}

  async findAll(
    page: number = 1,
    limit: number = 24,
    genre?: string,
    year?: number,
    sortBy?: string,
    countries?: string
  ): Promise<PaginatedResult<TVSeries>> {
    const queryBuilder = this.repository.createQueryBuilder("tv");

    queryBuilder.andWhere("tv.isBlocked = :isBlocked", { isBlocked: false });

    // Filter only aired TV series (exclude future releases)
    queryBuilder.andWhere("tv.firstAirDate <= :currentDate", {
      currentDate: new Date(),
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().slice(0, 10);
    const onAirThreshold = new Date(today);
    onAirThreshold.setDate(onAirThreshold.getDate() - 60);
    const onAirThresholdString = onAirThreshold.toISOString().slice(0, 10);

    if (genre) {
      queryBuilder.andWhere(":genre = ANY(tv.genreIds)", {
        genre: parseInt(genre),
      });
    }

    if (year) {
      queryBuilder.andWhere("EXTRACT(YEAR FROM tv.firstAirDate) = :year", {
        year,
      });
    }

    if (countries) {
      console.log(`🌍 Countries filter applied: ${countries}`);
      // For TV series, use originCountry array
      // Countries parameter comes as comma-separated string like "US,KR,JP"
      const countryList = countries.split(",").map((c) => c.trim());
      console.log(`🌍 Country list parsed:`, countryList);
      // Build OR conditions for each country
      const orConditions = countryList
        .map((country) => `'${country}' = ANY(tv.originCountry)`)
        .join(" OR ");
      console.log(`🌍 SQL condition:`, orConditions);
      queryBuilder.andWhere(`(${orConditions})`);
    }

    // Handle sorting
    switch (sortBy) {
      case "on_the_air":
        queryBuilder
          .andWhere("tv.firstAirDate IS NOT NULL")
          .andWhere("tv.firstAirDate <= :today", { today: todayString })
          .andWhere("tv.firstAirDate >= :threshold", {
            threshold: onAirThresholdString,
          })
          .orderBy("tv.firstAirDate", "DESC")
          .addOrderBy("tv.popularity", "DESC");
        break;
      case "popularity":
        // TV đang hot, nhiều người quan tâm
        queryBuilder.orderBy("tv.popularity", "DESC");
        break;
      case "quality":
        // TV chất lượng cao kết hợp rating, vote count và popularity
        queryBuilder
          .andWhere("tv.voteCount > :minVoteCount", { minVoteCount: 3 })
          .andWhere("tv.voteAverage > :minRating", { minRating: 5.5 })
          .orderBy(
            "(tv.voteAverage * LOG(tv.voteCount + 1) * LOG(tv.popularity + 1))",
            "DESC"
          )
          .addOrderBy("tv.voteAverage", "DESC");
        break;
      case "popular_rated":
        // Kết hợp popularity và rating cho quality content
        queryBuilder
          .andWhere("tv.voteCount > :minVoteCount", { minVoteCount: 5 })
          .andWhere("tv.voteAverage > :minRating", { minRating: 7.0 })
          .orderBy("(tv.popularity * tv.voteAverage)", "DESC")
          .addOrderBy("tv.voteCount", "DESC");
        break;
      case "top_rated":
        // TV chất lượng cao - kết hợp voteAverage và voteCount
        queryBuilder
          .andWhere("tv.voteCount > :minVoteCount", { minVoteCount: 5 })
          .andWhere("tv.voteAverage > :minRating", { minRating: 6.0 })
          .orderBy("(tv.voteAverage * LOG(tv.voteCount + 1))", "DESC") // Weighted rating
          .addOrderBy("tv.voteCount", "DESC");
        break;
      case "imdb":
        queryBuilder.orderBy("tv.voteAverage", "DESC");
        break;
      case "views":
        queryBuilder.orderBy("tv.popularity", "DESC");
        break;
      case "updated":
        queryBuilder.orderBy("tv.lastUpdated", "DESC");
        break;
      case "latest":
        // TV mới phát sóng gần đây - sử dụng firstAirDate
        queryBuilder
          .orderBy("tv.firstAirDate", "DESC", "NULLS LAST")
          .addOrderBy("tv.id", "DESC"); // Secondary sort for consistency
        break;
      default:
        // Default: TV phổ biến (popularity)
        queryBuilder.orderBy("tv.popularity", "DESC");
        break;
    }

    console.log(`🔍 TV SQL Query for sortBy=${sortBy}:`, queryBuilder.getSql());

    const total = await queryBuilder.getCount();
    const tvSeries = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data: tvSeries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: number): Promise<TVSeries> {
    return this.repository.findOne({ where: { id } });
  }

  async findByTmdbId(tmdbId: number): Promise<TVSeries> {
    return this.repository.findOne({ where: { tmdbId } });
  }

  async create(tvData: Partial<TVSeries>): Promise<TVSeries> {
    const tv = this.repository.create(tvData);
    return this.repository.save(tv);
  }

  async update(id: number, tvData: Partial<TVSeries>): Promise<TVSeries> {
    await this.repository.update(id, tvData);
    return this.findById(id);
  }

  async upsertByTmdbId(
    tmdbId: number,
    tvData: Partial<TVSeries>
  ): Promise<TVSeries> {
    const existingTv = await this.findByTmdbId(tmdbId);

    if (existingTv) {
      // Skip updating existing data to speed up initial sync
      return existingTv;
    } else {
      return this.create({ ...tvData, tmdbId });
    }
  }

  async search(
    query: string,
    page: number = 1,
    limit: number = 24
  ): Promise<PaginatedResult<TVSeries>> {
    try {
      // Try optimized search with pg_trgm extension
      return await this.searchOptimized(query, page, limit);
    } catch (error) {
      // Fallback to basic LIKE search if pg_trgm not available
      console.warn(
        "⚠️ Optimized search failed, falling back to LIKE search. Please run migration 008_add_search_optimization.sql",
        error.message
      );
      return await this.searchFallback(query, page, limit);
    }
  }

  private async searchOptimized(
    query: string,
    page: number,
    limit: number
  ): Promise<PaginatedResult<TVSeries>> {
    // Similarity threshold for fuzzy matching (trigram)
    const SIMILARITY_THRESHOLD = 0.3;

    // Weighted hybrid search query:
    // - FTS (Full-Text Search) for exact word matches = 100 points
    // - Trigram similarity for typo tolerance = similarity * 50 points
    // - Popularity boost = popularity / 100
    // - Rating boost = voteAverage * 2
    const qb = this.repository
      .createQueryBuilder("tv")
      .select("tv")
      .addSelect(
        `(CASE
          WHEN to_tsvector('simple', COALESCE(tv.title, '') || ' ' || COALESCE(tv."originalTitle", '')) @@ plainto_tsquery('simple', :query)
          THEN 100
          ELSE GREATEST(
            similarity(tv.title, :query),
            similarity(COALESCE(tv."originalTitle", ''), :query)
          ) * 50
        END) + (tv.popularity / 100) + (tv."voteAverage" * 2)`,
        "search_rank"
      )
      .where(
        new Brackets((qb) => {
          qb.where(
            `to_tsvector('simple', COALESCE(tv.title, '') || ' ' || COALESCE(tv."originalTitle", '')) @@ plainto_tsquery('simple', :query)`,
            { query }
          )
            .orWhere("similarity(tv.title, :query) > :threshold", {
              query,
              threshold: SIMILARITY_THRESHOLD,
            })
            .orWhere(
              'similarity(COALESCE(tv."originalTitle", \'\'), :query) > :threshold',
              { query, threshold: SIMILARITY_THRESHOLD }
            );
        })
      )
      .andWhere("tv.isBlocked = false")
      .orderBy("search_rank", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const [tvSeries, total] = await qb.getManyAndCount();

    return {
      data: tvSeries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async searchFallback(
    query: string,
    page: number,
    limit: number
  ): Promise<PaginatedResult<TVSeries>> {
    // Fallback to simple ILIKE search (case-insensitive, only title and originalTitle, NOT overview)
    const [tvSeries, total] = await this.repository.findAndCount({
      where: [
        { title: ILike(`%${query}%`), isBlocked: false },
        { originalTitle: ILike(`%${query}%`), isBlocked: false },
      ],
      skip: (page - 1) * limit,
      take: limit,
      order: { popularity: "DESC" },
    });

    return {
      data: tvSeries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
