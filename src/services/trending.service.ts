import { Injectable } from "@nestjs/common";
import { TrendingRepository } from "../repositories/trending.repository";
import { TMDBService } from "./tmdb.service";
import { Trending, MediaType } from "../entities/trending.entity";

export interface TrendingResponse {
  id: number;
  tmdbId: number;
  mediaType: string;
  title: string;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  thumbnailUrl: string | null;
  releaseDate: Date;
  voteAverage: number;
  voteCount: number;
  popularity: number;
  genreIds: number[];
  originalLanguage: string;
  adult: boolean;
  isHidden: boolean;
  hiddenReason: string | null;
  hiddenAt: Date | null;
  createdAt: Date;
  lastUpdated: Date;
}

@Injectable()
export class TrendingService {
  constructor(
    private trendingRepository: TrendingRepository,
    private tmdbService: TMDBService
  ) {}

  private transformTrending(trending: Trending): TrendingResponse {
    return {
      id: trending.id,
      tmdbId: trending.tmdbId,
      mediaType: trending.mediaType,
      title: trending.title,
      overview: trending.overview,
      posterUrl: this.tmdbService.getPosterUrl(trending.posterPath, "w500"),
      backdropUrl: this.tmdbService.getBackdropUrl(
        trending.backdropPath,
        "w1280"
      ),
      thumbnailUrl: this.tmdbService.getPosterUrl(trending.posterPath, "w185"),
      releaseDate: trending.releaseDate,
      voteAverage: trending.voteAverage,
      voteCount: trending.voteCount,
      popularity: trending.popularity,
      genreIds: trending.genreIds,
      originalLanguage: trending.originalLanguage,
      adult: trending.adult,
      isHidden: trending.isHidden,
      hiddenReason: trending.hiddenReason,
      hiddenAt: trending.hiddenAt,
      createdAt: trending.createdAt,
      lastUpdated: trending.lastUpdated,
    };
  }

  async findAll(
    page: number = 1,
    limit: number = 24,
    options: { includeHidden?: boolean } = {}
  ): Promise<{
    data: TrendingResponse[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { includeHidden = false } = options;
    const { data, total } = await this.trendingRepository.findAll(
      page,
      limit,
      includeHidden
    );

    return {
      data: data.map((item) => this.transformTrending(item)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async hideContent(
    tmdbId: number,
    mediaType: MediaType,
    reason?: string
  ): Promise<void> {
    await this.trendingRepository.setHiddenStatus(
      tmdbId,
      mediaType,
      true,
      reason
    );
  }

  async unhideContent(
    tmdbId: number,
    mediaType: MediaType
  ): Promise<void> {
    await this.trendingRepository.setHiddenStatus(tmdbId, mediaType, false);
  }
}
