import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { MovieRepository } from "../repositories/movie.repository";
import { SyncStatusRepository } from "../repositories/sync-status.repository";
import { RecommendationRepository } from "../repositories/recommendation.repository";
import { TMDBService } from "./tmdb.service";
import { Movie } from "../entities/movie.entity";
import { SyncCategory } from "../entities/sync-status.entity";
import { PaginatedResult } from "../interfaces/api.interface";
import {
  TMDB_MAX_PAGES,
  TMDB_DEFAULT_LANGUAGE,
} from "../constants/tmdb.constants";
import { normalizeLanguageTag } from "../constants/language.constants";
import { ContentTranslationRepository } from "../repositories/content-translation.repository";
import { parseOptionalDate } from "../utils/date.util";

export interface MovieResponse {
  id: number;
  tmdbId: number;
  title: string;
  originalTitle?: string | null;
  defaultTitle?: string | null;
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
  createdAt: Date;
  lastUpdated: Date;
}

@Injectable()
export class MovieService {
  private readonly logger = new Logger(MovieService.name);

  constructor(
    private movieRepository: MovieRepository,
    private syncStatusRepository: SyncStatusRepository,
    private tmdbService: TMDBService,
    private recommendationRepository: RecommendationRepository,
    private translationRepository: ContentTranslationRepository
  ) {}

  /**
   * Netflix-style lazy loading: Fill gaps in database to reach requested page
   */
  private async syncPageOnDemand(
    targetPage: number,
    genres?: string,
    year?: number,
    language: string = "en-US"
  ): Promise<void> {
    try {
      // TMDB API limit check - max pages for popular movies
      if (targetPage > TMDB_MAX_PAGES) {
        this.logger.warn(
          `🚫 Target page ${targetPage} exceeds TMDB API limit (max: ${TMDB_MAX_PAGES}). Cannot sync beyond this limit.`
        );
        throw new Error(
          `Page ${targetPage} is beyond TMDB API limit. Maximum available page is ${TMDB_MAX_PAGES}.`
        );
      }

      this.logger.log(
        `🎬 On-demand sync: Filling gaps to reach page ${targetPage}${
          genres ? ` (genres: ${genres})` : ""
        }${year ? ` (year: ${year})` : ""}`
      );

      // Strategy: Check if target page specifically is synced AND has actual data
      const isTargetSynced = await this.syncStatusRepository.isPageSynced(
        SyncCategory.MOVIES,
        targetPage,
        genres,
        year,
        language
      );

      // Double check: even if marked as synced, verify actual data exists
      if (isTargetSynced) {
        const testResult = await this.movieRepository.findAll(
          targetPage,
          1,
          genres,
          year
        );
        if (testResult.data.length > 0) {
          this.logger.debug(
            `📊 Target page ${targetPage} already synced and has data, no gap-fill needed`
          );
          return;
        } else {
          this.logger.warn(
            `📊 Target page ${targetPage} marked as synced but no actual data found. Proceeding with sync...`
          );
          // Clear stale sync status
          await this.syncStatusRepository.clearSyncStatus(
            SyncCategory.MOVIES,
            targetPage,
            genres,
            year,
            language
          );
        }
      }

      const syncedPages = await this.syncStatusRepository.getSyncedPages(
        SyncCategory.MOVIES,
        genres,
        year,
        language
      );

      const maxSyncedPage =
        syncedPages.length > 0 ? Math.max(...syncedPages) : 0;
      this.logger.debug(
        `📊 Max synced page: ${maxSyncedPage}, Target page: ${targetPage}, Synced pages: [${syncedPages
          .slice(0, 5)
          .join(",")}...]`
      );

      // Aggressive gap-fill for high page numbers: ensure continuous data chain
      let startPage = 1;
      let endPage = targetPage;

      if (maxSyncedPage >= targetPage) {
        // Target page is less than max synced - might be gaps in middle
        startPage = Math.max(1, targetPage - 5);
        endPage = Math.min(targetPage + 5, maxSyncedPage);
      } else {
        // Target page beyond max synced - need continuous data from current max to target
        startPage = Math.max(1, maxSyncedPage + 1);

        // For very high pages (>100), sync larger chunks to build continuous chain
        if (targetPage > 100) {
          // Sync in batches but ensure we reach the target
          const batchSize = Math.min(50, targetPage - maxSyncedPage + 5);
          endPage = Math.min(startPage + batchSize - 1, targetPage + 2);
        } else {
          endPage = Math.min(targetPage + 2, targetPage + 10);
        }
      }

      // Safety check: don't sync more than 100 pages at once to avoid timeout
      if (endPage - startPage + 1 > 100) {
        endPage = startPage + 99;
        this.logger.warn(
          `🚨 Limiting sync to 100 pages (${startPage}-${endPage}) to avoid timeout. Target page ${targetPage} may need multiple requests.`
        );
      }

      this.logger.log(
        `📥 Gap-fill strategy: Syncing pages ${startPage} to ${endPage} (max synced: ${maxSyncedPage}, target: ${targetPage})...`
      );

      for (let page = startPage; page <= endPage; page++) {
        // Skip if already synced
        if (syncedPages.includes(page)) {
          this.logger.debug(`⏭️ Skipping already synced page ${page}`);
          continue;
        }

        // Fetch from TMDB
        const tmdbResponse = await this.tmdbService.getSmartMovies(page, {
          genres,
          year,
          language,
        });

        if (tmdbResponse.results.length === 0) {
          this.logger.warn(
            `⚠️ No results from TMDB for page ${page}, stopping sync`
          );
          break;
        }

        // Save each movie to database
        for (const tmdbMovie of tmdbResponse.results) {
          const movieData: Partial<Movie> = {
            title: tmdbMovie.title,
            originalTitle: tmdbMovie.original_title,
            overview: tmdbMovie.overview,
            posterPath: tmdbMovie.poster_path,
            backdropPath: tmdbMovie.backdrop_path,
            releaseDate: parseOptionalDate(tmdbMovie.release_date),
            voteAverage: tmdbMovie.vote_average,
            voteCount: tmdbMovie.vote_count,
            popularity: tmdbMovie.popularity,
            genreIds: tmdbMovie.genre_ids,
            originalLanguage: tmdbMovie.original_language,
            adult: tmdbMovie.adult,
          };

          await this.movieRepository.upsertByTmdbId(tmdbMovie.id, movieData);
        }

        // Mark page as synced
        await this.syncStatusRepository.markPageSynced(
          SyncCategory.MOVIES,
          page,
          tmdbResponse.results.length,
          tmdbResponse.total_pages,
          genres,
          year,
          language,
          {
            source: "on-demand-gap-fill",
            tmdbTotalResults: tmdbResponse.total_results,
            syncedAt: new Date().toISOString(),
            targetPage: targetPage,
          }
        );

        this.logger.debug(
          `✅ Synced page ${page}: ${tmdbResponse.results.length} movies`
        );

        // Add delay to respect rate limits
        await this.delay(100);
      }

      this.logger.log(
        `✅ Gap-fill sync completed. Pages ${startPage}-${endPage} now available.`
      );

      // If we didn't reach the target page due to batch size limit, recursively sync more
      if (endPage < targetPage) {
        this.logger.log(
          `🔄 Target page ${targetPage} not reached yet. Continuing sync from page ${
            endPage + 1
          }...`
        );
        await this.syncPageOnDemand(targetPage, genres, year, language);
      }
    } catch (error) {
      this.logger.error(
        `❌ Failed to sync pages for target ${targetPage}:`,
        error.message
      );
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Enhanced findAll with Netflix-style lazy loading
   */
  async findAll(
    page: number = 1,
    limit: number = 24,
    genres?: string,
    year?: number,
    language: string = "en-US",
    sortBy?: string,
    countries?: string
  ): Promise<PaginatedResult<MovieResponse> & { isOnDemandSync?: boolean }> {
    let isOnDemandSync = false;

    // Step 1: Try to get data directly first
    let result = await this.movieRepository.findAll(
      page,
      limit,
      genres,
      year,
      sortBy,
      countries
    );

    // Step 2: If no data found, check if we should sync
    if (result.data.length === 0) {
      this.logger.log(
        `📥 Page ${page} returned empty. Checking if sync needed...`
      );

      // Check if we have sync status (might be stale)
      const isMarkedSynced = await this.syncStatusRepository.isPageSynced(
        SyncCategory.MOVIES,
        page,
        genres,
        year,
        language
      );

      if (isMarkedSynced) {
        this.logger.warn(
          `⚠️  Page ${page} marked as synced but no data found. Clearing stale status and re-syncing.`
        );
        await this.syncStatusRepository.clearSyncStatus(
          SyncCategory.MOVIES,
          page,
          genres,
          year,
          language
        );
      }

      // Fetch and sync this page on-demand (Netflix-style)
      this.logger.log(`🚀 Triggering on-demand sync for page ${page}...`);
      await this.syncPageOnDemand(page, genres, year, language);
      isOnDemandSync = true;

      // Optional: Smart prefetching - sync next page in background
      this.prefetchNextPage(page, genres, year, language).catch((error) => {
        this.logger.warn(
          `Background prefetch failed for page ${page + 1}:`,
          error.message
        );
      });

      // Re-fetch data after sync
      result = await this.movieRepository.findAll(
        page,
        limit,
        genres,
        year,
        sortBy
      );
    }

    // Step 4: Transform với image URLs
    const moviesWithImages = result.data.map((movie) => ({
      id: movie.id,
      tmdbId: movie.tmdbId,
      title: movie.title,
      originalTitle: movie.originalTitle || null,
      defaultTitle: movie.title || null,
      overview: movie.overview,
      posterUrl: this.tmdbService.getPosterUrl(movie.posterPath, "w500"),
      backdropUrl: this.tmdbService.getBackdropUrl(movie.backdropPath, "w1280"),
      thumbnailUrl: this.tmdbService.getPosterUrl(movie.posterPath, "w185"),
      releaseDate: movie.releaseDate,
      voteAverage: movie.voteAverage,
      voteCount: movie.voteCount,
      popularity: movie.popularity,
      genreIds: movie.genreIds,
      originalLanguage: movie.originalLanguage,
      adult: movie.adult,
      createdAt: movie.createdAt,
      lastUpdated: movie.lastUpdated,
    }));

    // Step 5: Merge translations if non-default language
    if (language && language !== TMDB_DEFAULT_LANGUAGE) {
      await this.mergeTranslations(moviesWithImages, "movie", language);
    }

    // Step 6: Use actual database pagination (not TMDB total)
    const enhancedPagination = result.pagination;

    return {
      data: moviesWithImages,
      pagination: enhancedPagination,
      isOnDemandSync, // Let frontend know this was lazy-loaded
    };
  }

  /**
   * Smart prefetching: Background sync next page for better UX
   */
  private async prefetchNextPage(
    currentPage: number,
    genres?: string,
    year?: number,
    language: string = "en-US"
  ): Promise<void> {
    const nextPage = currentPage + 1;

    // Check if next page has data by trying a quick query
    const nextPageCheck = await this.movieRepository.findAll(
      nextPage,
      1,
      genres,
      year
    );

    if (nextPageCheck.data.length === 0) {
      this.logger.debug(`🔄 Background prefetching page ${nextPage}...`);
      await this.syncPageOnDemand(nextPage, genres, year, language);
    } else {
      this.logger.debug(
        `✅ Page ${nextPage} already has data, skipping prefetch`
      );
    }
  }

  async findById(id: number, language: string = "en-US"): Promise<MovieResponse> {
    // First, try to find movie in database
    let movie = await this.movieRepository.findById(id);

    if (!movie) {
      this.logger.debug(
        `🔍 Movie ID ${id} not found in database, trying TMDB...`
      );

      try {
        // Try to fetch from TMDB using the ID as TMDB ID
        const tmdbMovie = await this.tmdbService.getMovieDetails(id);

        this.logger.debug(
          `✅ Found movie in TMDB: ${tmdbMovie.title}, saving to database...`
        );
        this.logger.debug(
          `🔍 TMDB Movie data:`,
          JSON.stringify(tmdbMovie, null, 2)
        );

        // Save the movie to database for future requests
        movie = await this.movieRepository.upsertByTmdbId(tmdbMovie.id, {
          title: tmdbMovie.title,
          originalTitle: tmdbMovie.original_title,
          overview: tmdbMovie.overview,
          posterPath: tmdbMovie.poster_path,
          backdropPath: tmdbMovie.backdrop_path,
          releaseDate: parseOptionalDate(tmdbMovie.release_date),
          voteAverage: tmdbMovie.vote_average,
          voteCount: tmdbMovie.vote_count,
          popularity: tmdbMovie.popularity,
          genreIds: tmdbMovie.genre_ids,
          originalLanguage: tmdbMovie.original_language,
          adult: tmdbMovie.adult || false,
        });

        this.logger.debug(`💾 Movie saved to database with ID: ${movie.id}`);
      } catch (tmdbError) {
        const status = tmdbError?.response?.status;
        const message = tmdbError instanceof Error ? tmdbError.message : String(tmdbError);

        if (status === 404) {
          this.logger.debug(`Movie ID ${id} not found in TMDB (404)`);
        } else {
          this.logger.error(`❌ Failed to fetch movie ID ${id} from TMDB:`, message);
        }

        throw new NotFoundException(
          `Movie with ID ${id} not found in database or TMDB`
        );
      }
    }

    const transformed = this.transformMovie(movie);

    // Merge translation if not default language
    if (language !== TMDB_DEFAULT_LANGUAGE) {
      await this.mergeTranslations(
        [transformed as any],
        "movie",
        language
      );
    }

    return transformed;
  }

  private transformMovie(movie: any): MovieResponse {
    return {
      id: movie.id,
      tmdbId: movie.tmdbId,
      title: movie.title,
      originalTitle: movie.originalTitle || null,
      defaultTitle: movie.title || null,
      overview: movie.overview,
      posterUrl: this.tmdbService.getPosterUrl(movie.posterPath, "w500"),
      backdropUrl: this.tmdbService.getBackdropUrl(movie.backdropPath, "w1280"),
      thumbnailUrl: this.tmdbService.getPosterUrl(movie.posterPath, "w185"),
      releaseDate: movie.releaseDate,
      voteAverage: movie.voteAverage,
      voteCount: movie.voteCount,
      popularity: movie.popularity,
      genreIds: movie.genreIds,
      originalLanguage: movie.originalLanguage,
      adult: movie.adult,
      createdAt: movie.createdAt,
      lastUpdated: movie.lastUpdated,
    };
  }

  /**
   * Merge translations into response objects for non-default languages.
   * Mutates items in place for performance.
   */
  private async mergeTranslations(
    items: Array<{ tmdbId: number; title: string; overview: string }>,
    contentType: "movie" | "tv",
    language: string
  ): Promise<void> {
    const tmdbIds = items.map((item) => item.tmdbId);
    const translations =
      await this.translationRepository.findByTmdbIds(
        tmdbIds,
        contentType,
        language
      );

    if (translations.length === 0) return;

    const translationMap = new Map(
      translations.map((t) => [t.tmdbId, t])
    );

    for (const item of items) {
      const t = translationMap.get(item.tmdbId);
      if (t) {
        if (t.title) item.title = t.title;
        if (t.overview) item.overview = t.overview;
      }
    }
  }

  private async ensureMovieTranslation(
    tmdbId: number,
    language: string,
    defaultTitle?: string | null,
    defaultOverview?: string | null
  ): Promise<void> {
    const normalizedLanguage = normalizeLanguageTag(language);
    if (normalizedLanguage === TMDB_DEFAULT_LANGUAGE) return;

    const existing = await this.translationRepository.findByTmdbId(
      tmdbId,
      "movie",
      normalizedLanguage
    );

    const existingLooksLikeFallback =
      existing &&
      (existing.title || "") === (defaultTitle || "") &&
      (existing.overview || "") === (defaultOverview || "");

    if ((existing?.title || existing?.overview) && !existingLooksLikeFallback) {
      return;
    }

    try {
      const translation = await this.tmdbService.getMovieTranslation(
        tmdbId,
        normalizedLanguage
      );

      if (!translation?.title && !translation?.overview) {
        this.logger.debug(
          `No TMDB movie translation found for TMDB ID ${tmdbId} (${normalizedLanguage})`
        );
        return;
      }

      await this.translationRepository.upsert(
        tmdbId,
        "movie",
        normalizedLanguage,
        translation.title,
        translation.overview
      );
    } catch (error) {
      this.logger.debug(
        `Movie translation unavailable for TMDB ID ${tmdbId} (${normalizedLanguage}): ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async search(
    query: string,
    page: number = 1
  ): Promise<PaginatedResult<Movie>> {
    return this.movieRepository.search(query, page);
  }

  /**
   * Lấy recommendations cho movie với cache-first approach
   * 1. Check cache trước - nếu có thì return ngay (nhanh ~50ms)
   * 2. Nếu chưa có cache thì gọi TMDB API và cache kết quả (chậm ~500ms)
   * 3. Lần sau sẽ sử dụng cache đã lưu
   *
   * @param tmdbId - TMDB ID của movie
   * @param page - Page number (hiện tại chỉ support page 1)
   * @returns Array recommendations
   */
  async getRecommendations(tmdbId: number, page: number = 1): Promise<any[]> {
    try {
      this.logger.debug(
        `🎬 Getting recommendations for movie TMDB ID: ${tmdbId}`
      );

      // BƯỚC 1: Kiểm tra cache trước
      const cachedRecommendations =
        await this.recommendationRepository.findRecommendations(
          "movie",
          tmdbId,
          12
        );

      if (cachedRecommendations.length > 0) {
        // ✅ CÓ CACHE - Trả về ngay lập tức
        this.logger.debug(
          `⚡ Found ${cachedRecommendations.length} CACHED recommendations for movie ${tmdbId}`
        );

        // Return cached data (đã được format sẵn)
        return cachedRecommendations.map((rec) => rec.recommendedContentData);
      }

      // ❌ CHƯA CÓ CACHE - Gọi TMDB API
      this.logger.debug(
        `🌐 No cache found, fetching from TMDB API for movie ${tmdbId}...`
      );

      const tmdbRecommendations =
        await this.tmdbService.getMovieRecommendations(tmdbId, page);

      // Format data cho frontend
      const formattedRecommendations = tmdbRecommendations.map((movie) => ({
        id: movie.id,
        title: movie.title,
        overview: movie.overview,
        poster_path: movie.poster_path,
        backdrop_path: movie.backdrop_path,
        release_date: movie.release_date,
        vote_average: movie.vote_average,
        vote_count: movie.vote_count,
        popularity: movie.popularity,
        genre_ids: movie.genre_ids,
        original_language: movie.original_language,
        adult: movie.adult,
      }));

      // Lưu vào cache cho lần sau (async, không block response)
      if (formattedRecommendations.length > 0) {
        setImmediate(async () => {
          try {
            await this.recommendationRepository.upsertRecommendations(
              "movie",
              tmdbId,
              formattedRecommendations
            );
            this.logger.debug(
              `💾 Cached ${formattedRecommendations.length} recommendations for movie ${tmdbId}`
            );
          } catch (cacheError) {
            this.logger.warn(
              `Failed to cache recommendations for movie ${tmdbId}:`,
              cacheError.message
            );
          }
        });
      }

      return formattedRecommendations;
    } catch (error) {
      this.logger.error(
        `❌ Failed to fetch recommendations for movie TMDB ID ${tmdbId}:`,
        error.message
      );

      // Return empty array thay vì throw error để không break UI
      return [];
    }
  }

  /**
   * Get movie with credits (cast and crew) from TMDB using TMDB ID
   */
  async findByTmdbIdWithCredits(
    tmdbId: number,
    language: string = "en-US"
  ): Promise<any> {
    try {
      const movieWithCredits = await this.tmdbService.getMovieWithCredits(
        tmdbId,
        language
      );

      return {
        // Basic movie info
        id: movieWithCredits.id,
        title: movieWithCredits.title,
        overview: movieWithCredits.overview,
        poster_path: movieWithCredits.poster_path,
        backdrop_path: movieWithCredits.backdrop_path,
        release_date: movieWithCredits.release_date,
        vote_average: movieWithCredits.vote_average,
        vote_count: movieWithCredits.vote_count,
        popularity: movieWithCredits.popularity,
        genre_ids: movieWithCredits.genre_ids,
        original_language: movieWithCredits.original_language,
        adult: movieWithCredits.adult,

        // Enhanced details
        genres: movieWithCredits.genres,
        production_countries: movieWithCredits.production_countries,
        production_companies: movieWithCredits.production_companies,
        runtime: movieWithCredits.runtime,
        status: movieWithCredits.status,
        tagline: movieWithCredits.tagline,

        // Credits
        cast: movieWithCredits.cast,
        crew: movieWithCredits.crew,
      };
    } catch (error) {
      this.logger.error(
        `❌ Error fetching movie with credits for TMDB ID ${tmdbId}:`,
        error.message
      );
      throw new NotFoundException(
        `Movie with TMDB ID ${tmdbId} not found or credits unavailable`
      );
    }
  }

  /**
   * Get now playing movies with cache-first approach
   */
  async getNowPlayingMovies(
    page: number = 1,
    limit: number = 6,
    language: string = "en-US"
  ): Promise<PaginatedResult<MovieResponse> & { isOnDemandSync?: boolean }> {
    return this.findAll(page, limit, null, null, language, "now_playing");
  }

  /**
   * Get popular movies with cache-first approach
   */
  async getPopularMovies(
    page: number = 1,
    limit: number = 6,
    language: string = "en-US"
  ): Promise<PaginatedResult<MovieResponse> & { isOnDemandSync?: boolean }> {
    return this.findAll(page, limit, null, null, language, "popularity");
  }

  /**
   * Get top rated movies with cache-first approach
   */
  async getTopRatedMovies(
    page: number = 1,
    limit: number = 6,
    language: string = "en-US"
  ): Promise<PaginatedResult<MovieResponse> & { isOnDemandSync?: boolean }> {
    return this.findAll(page, limit, null, null, language, "top_rated");
  }

  /**
   * Get upcoming movies with cache-first approach
   */
  async getUpcomingMovies(
    page: number = 1,
    limit: number = 6,
    language: string = "en-US"
  ): Promise<PaginatedResult<MovieResponse> & { isOnDemandSync?: boolean }> {
    return this.findAll(page, limit, null, null, language, "upcoming");
  }

  /**
   * Find movie by TMDB ID (prioritize TMDB ID over internal ID)
   */
  async findByTmdbId(tmdbId: number, language: string = "en-US"): Promise<MovieResponse> {
    const normalizedLanguage = normalizeLanguageTag(language);
    // First, try to find movie by TMDB ID in database
    let movie = await this.movieRepository.findByTmdbId(tmdbId);

    if (!movie) {
      this.logger.debug(
        `🔍 Movie TMDB ID ${tmdbId} not found in database, fetching from TMDB...`
      );

      try {
        // Fetch from TMDB API
        const tmdbMovie = await this.tmdbService.getMovieDetails(tmdbId);

        this.logger.debug(
          `✅ Found movie in TMDB: ${tmdbMovie.title}, saving to database...`
        );

        // Save the movie to database for future requests
        movie = await this.movieRepository.upsertByTmdbId(tmdbMovie.id, {
          title: tmdbMovie.title,
          originalTitle: tmdbMovie.original_title,
          overview: tmdbMovie.overview,
          posterPath: tmdbMovie.poster_path,
          backdropPath: tmdbMovie.backdrop_path,
          releaseDate: parseOptionalDate(tmdbMovie.release_date),
          voteAverage: tmdbMovie.vote_average,
          voteCount: tmdbMovie.vote_count,
          popularity: tmdbMovie.popularity,
          genreIds: tmdbMovie.genre_ids,
          originalLanguage: tmdbMovie.original_language,
          adult: tmdbMovie.adult || false,
        });

        this.logger.debug(`💾 Movie saved to database with ID: ${movie.id}`);
      } catch (tmdbError) {
        const status = tmdbError?.response?.status;
        const message = tmdbError instanceof Error ? tmdbError.message : String(tmdbError);

        if (status === 404) {
          this.logger.debug(`Movie TMDB ID ${tmdbId} not found in TMDB (404)`);
        } else {
          this.logger.error(`❌ Failed to fetch movie TMDB ID ${tmdbId} from TMDB:`, message);
        }

        throw new NotFoundException(`Movie with TMDB ID ${tmdbId} not found`);
      }
    }

    const transformed = this.transformMovie(movie);

    if (normalizedLanguage !== TMDB_DEFAULT_LANGUAGE) {
      await this.ensureMovieTranslation(
        tmdbId,
        normalizedLanguage,
        transformed.defaultTitle,
        transformed.overview
      );
      await this.mergeTranslations(
        [transformed as any],
        "movie",
        normalizedLanguage
      );
    }

    return transformed;
  }

  /**
   * Find internal ID by TMDB ID
   */
  async findInternalIdByTmdbId(tmdbId: number): Promise<number | null> {
    try {
      const movie = await this.movieRepository.findByTmdbId(tmdbId);
      return movie ? movie.id : null;
    } catch (error) {
      this.logger.error(
        `Error finding movie by TMDB ID ${tmdbId}:`,
        error.message
      );
      return null;
    }
  }
}
