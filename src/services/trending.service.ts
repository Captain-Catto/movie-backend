import { Injectable, Logger } from "@nestjs/common";
import { TrendingRepository } from "../repositories/trending.repository";
import { ContentTranslationRepository } from "../repositories/content-translation.repository";
import { TMDBService } from "./tmdb.service";
import { TMDB_DEFAULT_LANGUAGE } from "../constants/tmdb.constants";
import { Trending, MediaType } from "../entities/trending.entity";
import { TMDBTrending } from "../interfaces/tmdb-api.interface";
import { parseOptionalDate } from "../utils/date.util";

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
  private readonly logger = new Logger(TrendingService.name);

  constructor(
    private trendingRepository: TrendingRepository,
    private tmdbService: TMDBService,
    private translationRepository: ContentTranslationRepository
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

  private transformTmdbTrending(item: TMDBTrending): TrendingResponse {
    const now = new Date();
    const mediaType =
      item.media_type === MediaType.TV ? MediaType.TV : MediaType.MOVIE;
    const title =
      item.title || item.name || item.original_title || item.original_name || "";

    return {
      id: item.id,
      tmdbId: item.id,
      mediaType,
      title,
      overview: item.overview || "",
      posterUrl: this.tmdbService.getPosterUrl(item.poster_path, "w500"),
      backdropUrl: this.tmdbService.getBackdropUrl(item.backdrop_path, "w1280"),
      thumbnailUrl: this.tmdbService.getPosterUrl(item.poster_path, "w185"),
      releaseDate: parseOptionalDate(item.release_date || item.first_air_date),
      voteAverage: item.vote_average || 0,
      voteCount: item.vote_count || 0,
      popularity: item.popularity || 0,
      genreIds: item.genre_ids || [],
      originalLanguage: item.original_language || "",
      adult: item.adult || false,
      isHidden: false,
      hiddenReason: null,
      hiddenAt: null,
      createdAt: now,
      lastUpdated: now,
    };
  }

  private async mergeTranslations(
    items: TrendingResponse[],
    language: string
  ): Promise<void> {
    // Split by media type since translations are stored per content type
    const movieItems = items.filter((i) => i.mediaType === "movie");
    const tvItems = items.filter((i) => i.mediaType === "tv");

    const [movieTranslations, tvTranslations] = await Promise.all([
      movieItems.length > 0
        ? this.translationRepository.findByTmdbIds(
            movieItems.map((i) => i.tmdbId),
            "movie",
            language
          )
        : [],
      tvItems.length > 0
        ? this.translationRepository.findByTmdbIds(
            tvItems.map((i) => i.tmdbId),
            "tv",
            language
          )
        : [],
    ]);

    const translationMap = new Map(
      [...movieTranslations, ...tvTranslations].map((t) => [
        `${t.contentType}:${t.tmdbId}`,
        t,
      ])
    );

    for (const item of items) {
      const t = translationMap.get(`${item.mediaType}:${item.tmdbId}`);
      if (t) {
        if (t.title) item.title = t.title;
        if (t.overview) item.overview = t.overview;
      }
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 24,
    options: { includeHidden?: boolean } = {},
    language: string = "en-US"
  ): Promise<{
    data: TrendingResponse[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const normalizedPage = Math.max(Number(page) || 1, 1);
    const normalizedLimit = Math.max(Number(limit) || 24, 1);
    const { includeHidden = false } = options;
    const { data, total } = await this.trendingRepository.findAll(
      normalizedPage,
      normalizedLimit,
      includeHidden
    );

    let transformed = data.map((item) => this.transformTrending(item));
    let resultTotal = total;

    if (!includeHidden && normalizedPage === 1 && transformed.length === 0) {
      this.logger.warn(
        `Trending cache returned empty for page=${normalizedPage}, limit=${normalizedLimit}; falling back to live TMDB trending data`
      );

      const liveItems = await this.tmdbService.getTrending(
        "all",
        "week",
        language,
        1
      );

      transformed = liveItems
        .filter((item) => item.poster_path)
        .slice(0, normalizedLimit)
        .map((item) => this.transformTmdbTrending(item));
      resultTotal = transformed.length;

      this.logger.log(
        `Live TMDB trending fallback returned ${transformed.length} items`
      );
    }

    // Merge translations if not default language
    if (language !== TMDB_DEFAULT_LANGUAGE) {
      await this.mergeTranslations(transformed, language);
    }

    return {
      data: transformed,
      pagination: {
        page: normalizedPage,
        limit: normalizedLimit,
        total: resultTotal,
        totalPages: Math.ceil(resultTotal / normalizedLimit),
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
