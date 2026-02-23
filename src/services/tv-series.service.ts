import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { TVSeriesRepository } from "../repositories/tv-series.repository";
import { RecommendationRepository } from "../repositories/recommendation.repository";
import { TMDBService } from "./tmdb.service";
import { TMDBSeasonDetails } from "../interfaces/tmdb-api.interface";
import { TVSeries } from "../entities/tv-series.entity";
import { PaginatedResult } from "../interfaces/api.interface";

export interface TVSeriesResponse {
  id: number;
  tmdbId: number;
  title: string;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  thumbnailUrl: string | null;
  firstAirDate: Date;
  voteAverage: number;
  voteCount: number;
  popularity: number;
  genreIds: number[];
  originalLanguage: string;
  originCountry: string[];
  createdAt: Date;
  lastUpdated: Date;
  created_by?: any[]; // TMDB creators info
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  episodeRunTime?: number[];
  status?: string;
  lastAirDate?: Date;
  type?: string;
  adult?: boolean;
  inProduction?: boolean;
  originalTitle?: string;
  production_countries?: any[]; // Production countries info
}

@Injectable()
export class TVSeriesService {
  private readonly logger = new Logger(TVSeriesService.name);
  private seasonCache = new Map<string, { data: TMDBSeasonDetails; timestamp: number }>();
  private readonly SEASON_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private tvSeriesRepository: TVSeriesRepository,
    private tmdbService: TMDBService,
    private recommendationRepository: RecommendationRepository
  ) {}

  private transformTVSeries(
    tvSeries: TVSeries,
    tmdbData?: any
  ): TVSeriesResponse {
    return {
      id: tvSeries.id,
      tmdbId: tvSeries.tmdbId,
      title: tvSeries.title,
      overview: tvSeries.overview,
      posterUrl: this.tmdbService.getPosterUrl(tvSeries.posterPath, "w500"),
      backdropUrl: this.tmdbService.getBackdropUrl(
        tvSeries.backdropPath,
        "w1280"
      ),
      thumbnailUrl: this.tmdbService.getPosterUrl(tvSeries.posterPath, "w185"),
      firstAirDate: tvSeries.firstAirDate,
      voteAverage: tvSeries.voteAverage,
      voteCount: tvSeries.voteCount,
      popularity: tvSeries.popularity,
      genreIds: tvSeries.genreIds,
      originalLanguage: tvSeries.originalLanguage,
      originCountry: tvSeries.originCountry,
      createdAt: tvSeries.createdAt,
      lastUpdated: tvSeries.lastUpdated,
      // Add TMDB-specific data if available
      ...(tmdbData && {
        created_by: tmdbData.created_by,
        numberOfSeasons: tmdbData.number_of_seasons,
        numberOfEpisodes: tmdbData.number_of_episodes,
        episodeRunTime: tmdbData.episode_run_time,
        status: tmdbData.status,
        lastAirDate: tmdbData.last_air_date
          ? new Date(tmdbData.last_air_date)
          : undefined,
        type: tmdbData.type,
        adult: tmdbData.adult,
        inProduction: tmdbData.in_production,
        originalTitle: tmdbData.original_name,
        production_countries: tmdbData.production_countries,
      }),
    };
  }

  async findAll(
    page: number = 1,
    limit: number = 24,
    genre?: string,
    year?: number,
    sortBy?: string,
    language: string = "en-US",
    countries?: string
  ): Promise<PaginatedResult<TVSeriesResponse>> {
    this.logger.log(
      `🔍 TVSeriesService.findAll called with: page=${page}, limit=${limit}, genre=${genre}, year=${year}, sortBy=${sortBy}, language=${language}, countries=${countries}`
    );

    const result = await this.tvSeriesRepository.findAll(
      page,
      limit,
      genre,
      year,
      sortBy,
      countries
    );

    const tvSeriesWithImages = result.data.map((tvSeries) =>
      this.transformTVSeries(tvSeries)
    );

    return {
      ...result,
      data: tvSeriesWithImages,
    };
  }

  async findById(id: number): Promise<TVSeriesResponse> {
    const tvSeries = await this.tvSeriesRepository.findById(id);

    if (!tvSeries) {
      throw new NotFoundException(
        `TV Series with ID ${id} not found in database`
      );
    }

    return this.transformTVSeries(tvSeries);
  }

  async search(
    query: string,
    page: number = 1
  ): Promise<PaginatedResult<TVSeriesResponse>> {
    const result = await this.tvSeriesRepository.search(query, page);

    const tvSeriesWithImages = result.data.map((tvSeries) =>
      this.transformTVSeries(tvSeries)
    );

    return {
      ...result,
      data: tvSeriesWithImages,
    };
  }

  /**
   * Lấy recommendations cho TV series với cache-first approach
   * 1. Check cache trước - nếu có thì return ngay (nhanh ~50ms)
   * 2. Nếu chưa có cache thì gọi TMDB API và cache kết quả (chậm ~500ms)
   * 3. Lần sau sẽ sử dụng cache đã lưu
   *
   * @param tmdbId - TMDB ID của TV series
   * @param page - Page number (hiện tại chỉ support page 1)
   * @returns Array recommendations
   */
  async getRecommendations(tmdbId: number, page: number = 1): Promise<any[]> {
    try {
      this.logger.log(
        `📺 Getting recommendations for TV series TMDB ID: ${tmdbId}`
      );

      // BƯỚC 1: Kiểm tra cache trước
      const cachedRecommendations =
        await this.recommendationRepository.findRecommendations(
          "tv",
          tmdbId,
          12
        );

      if (cachedRecommendations.length > 0) {
        // ✅ CÓ CACHE - Trả về ngay lập tức
        this.logger.log(
          `⚡ Found ${cachedRecommendations.length} CACHED recommendations for TV ${tmdbId}`
        );

        // Return cached data (đã được format sẵn)
        return cachedRecommendations.map((rec) => rec.recommendedContentData);
      }

      // ❌ CHƯA CÓ CACHE - Gọi TMDB API
      this.logger.log(
        `🌐 No cache found, fetching from TMDB API for TV ${tmdbId}...`
      );

      const tmdbRecommendations = await this.tmdbService.getTVRecommendations(
        tmdbId,
        page
      );

      // Format data cho frontend
      const formattedRecommendations = tmdbRecommendations.map((tvSeries) => ({
        id: tvSeries.id,
        name: tvSeries.name,
        title: tvSeries.name, // For consistency with frontend
        overview: tvSeries.overview,
        poster_path: tvSeries.poster_path,
        backdrop_path: tvSeries.backdrop_path,
        first_air_date: tvSeries.first_air_date,
        vote_average: tvSeries.vote_average,
        vote_count: tvSeries.vote_count,
        popularity: tvSeries.popularity,
        genre_ids: tvSeries.genre_ids,
        original_language: tvSeries.original_language,
        origin_country: tvSeries.origin_country,
      }));

      // Lưu vào cache cho lần sau (async, không block response)
      if (formattedRecommendations.length > 0) {
        setImmediate(async () => {
          try {
            await this.recommendationRepository.upsertRecommendations(
              "tv",
              tmdbId,
              formattedRecommendations
            );
            this.logger.log(
              `💾 Cached ${formattedRecommendations.length} recommendations for TV ${tmdbId}`
            );
          } catch (cacheError) {
            this.logger.warn(
              `Failed to cache recommendations for TV ${tmdbId}:`,
              cacheError.message
            );
          }
        });
      }

      return formattedRecommendations;
    } catch (error) {
      this.logger.error(
        `❌ Failed to fetch recommendations for TV TMDB ID ${tmdbId}:`,
        error.message
      );

      // Return empty array thay vì throw error để không break UI
      return [];
    }
  }

  /**
   * Find TV series by TMDB ID (prioritize TMDB ID over internal ID)
   */
  async findByTmdbId(tmdbId: number): Promise<TVSeriesResponse> {
    const tvSeries = await this.tvSeriesRepository.findByTmdbId(tmdbId);

    if (!tvSeries) {
      throw new NotFoundException(
        `TV Series with TMDB ID ${tmdbId} not found in database`
      );
    }

    return this.transformTVSeries(tvSeries);
  }

  /**
   * Get TV series credits (cast and crew) from TMDB using TMDB ID
   */
  async getTVCredits(tmdbId: number, language: string = "en-US") {
    try {
      this.logger.log(`Fetching TV credits for TMDB ID: ${tmdbId}`);

      // Get TV credits from TMDB
      const credits = await this.tmdbService.getTVCredits(tmdbId, language);

      this.logger.log(`✅ Found TV credits for TMDB ID ${tmdbId}`);

      return credits;
    } catch (error) {
      this.logger.error(
        `❌ TV Series TMDB ID ${tmdbId} credits not found:`,
        error.message
      );
      throw new NotFoundException(
        `TV Series credits with TMDB ID ${tmdbId} not found`
      );
    }
  }

  async getSeasonEpisodes(
    tmdbId: number,
    seasonNumber: number,
    language: string = "en-US"
  ): Promise<TMDBSeasonDetails> {
    const cacheKey = `${tmdbId}:${seasonNumber}:${language}`;
    const cached = this.seasonCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.SEASON_CACHE_TTL) {
      return cached.data;
    }

    const data = await this.tmdbService.getTVSeasonDetails(
      tmdbId,
      seasonNumber,
      language
    );
    this.seasonCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  }

  /**
   * Find internal ID by TMDB ID
   */
  async findInternalIdByTmdbId(tmdbId: number): Promise<number | null> {
    try {
      const tvSeries = await this.tvSeriesRepository.findByTmdbId(tmdbId);
      return tvSeries ? tvSeries.id : null;
    } catch (error) {
      this.logger.error(
        `Error finding TV series by TMDB ID ${tmdbId}:`,
        error.message
      );
      return null;
    }
  }

  /**
   * Get on the air TV series with cache-first approach
   */
  async getOnTheAirTVSeries(
    page: number = 1,
    limit: number = 6,
    language: string = "en-US"
  ): Promise<PaginatedResult<TVSeriesResponse> & { isOnDemandSync?: boolean }> {
    return this.findAll(
      page,
      limit,
      undefined,
      undefined,
      "on_the_air",
      language
    );
  }

  /**
   * Get popular TV series with cache-first approach
   */
  async getPopularTVSeries(
    page: number = 1,
    limit: number = 6,
    language: string = "en-US"
  ): Promise<PaginatedResult<TVSeriesResponse> & { isOnDemandSync?: boolean }> {
    return this.findAll(
      page,
      limit,
      undefined,
      undefined,
      "popularity",
      language
    );
  }

  /**
   * Get top rated TV series with cache-first approach
   */
  async getTopRatedTVSeries(
    page: number = 1,
    limit: number = 6,
    language: string = "en-US"
  ): Promise<PaginatedResult<TVSeriesResponse> & { isOnDemandSync?: boolean }> {
    return this.findAll(
      page,
      limit,
      undefined,
      undefined,
      "top_rated",
      language
    );
  }
}
