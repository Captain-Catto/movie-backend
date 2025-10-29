import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Favorite } from "../entities/favorite.entity";

export interface FavoriteOptions {
  page: number;
  limit: number;
}

@Injectable()
export class FavoriteRepository {
  constructor(
    @InjectRepository(Favorite)
    private readonly repository: Repository<Favorite>
  ) {}

  async findByUserId(userId: number, options: FavoriteOptions) {
    const { page, limit } = options;

    const queryBuilder = this.repository
      .createQueryBuilder("f")
      .leftJoin(
        "movies",
        "m",
        "f.content_id = m.\"tmdbId\"::text AND f.content_type = 'movie'"
      )
      .leftJoin(
        "tv_series",
        "t",
        "f.content_id = t.\"tmdbId\"::text AND f.content_type = 'tv'"
      )
      .select([
        "f.id as id",
        "f.user_id as userId",
        "f.content_id as contentId",
        "f.content_type as contentType",
        "f.created_at as createdAt",
        // Movie/TV data
        'COALESCE("m"."title", "t"."title") as title',
        'COALESCE("m"."posterPath", "t"."posterPath") as posterPath',
        'COALESCE("m"."backdropPath", "t"."backdropPath") as backdropPath',
        'COALESCE("m"."overview", "t"."overview") as overview',
        'COALESCE("m"."voteAverage", "t"."voteAverage") as voteAverage',
        'COALESCE("m"."releaseDate", "t"."firstAirDate") as releaseDate',
        'COALESCE("m"."genreIds", "t"."genreIds") as genreIds',
      ])
      .where("f.user_id = :userId", { userId })
      .orderBy("f.created_at", "DESC") // Most recent first
      .offset((page - 1) * limit)
      .limit(limit);

    // Get total count
    const countQueryBuilder = this.repository
      .createQueryBuilder("f")
      .where("f.user_id = :userId", { userId });

    const [results, total] = await Promise.all([
      queryBuilder.getRawMany(),
      countQueryBuilder.getCount(),
    ]);

    return {
      data: results,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    };
  }

  async findById(id: number): Promise<Favorite | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByUserAndContent(
    userId: number,
    contentId: string,
    contentType: "movie" | "tv"
  ): Promise<Favorite | null> {
    return this.repository.findOne({
      where: {
        userId,
        contentId,
        contentType,
      },
    });
  }

  async create(
    favorite: Omit<Favorite, "id" | "createdAt">
  ): Promise<Favorite> {
    const newFavorite = this.repository.create(favorite);
    return this.repository.save(newFavorite);
  }

  async delete(
    userId: number,
    contentId: string,
    contentType: "movie" | "tv"
  ): Promise<void> {
    await this.repository.delete({
      userId,
      contentId,
      contentType,
    });
  }
}
