import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TMDBService } from "./tmdb.service";
import { TMDBMovie, TMDBTVSeries } from "../interfaces/tmdb-api.interface";
import { MovieRepository } from "../repositories/movie.repository";
import { TVSeriesRepository } from "../repositories/tv-series.repository";
import { ContentTranslationRepository } from "../repositories/content-translation.repository";
import { Movie } from "../entities/movie.entity";
import { TVSeries } from "../entities/tv-series.entity";
import {
  TRANSLATION_LANGUAGES,
} from "../constants/tmdb.constants";
import axios from "axios";
import * as zlib from "zlib";
import { pipeline } from "stream";
import { promisify } from "util";
import * as readline from "readline";

interface DailyExportItem {
  id: number;
  adult: boolean;
  video?: boolean;
  popularity: number;
}

@Injectable()
export class DailySyncService {
  private readonly logger = new Logger(DailySyncService.name);
  private readonly pipelineAsync = promisify(pipeline);

  constructor(
    private configService: ConfigService,
    private tmdbService: TMDBService,
    private movieRepository: MovieRepository,
    private tvSeriesRepository: TVSeriesRepository,
    private translationRepository: ContentTranslationRepository
  ) {}

  private isTranslationSyncEnabled(): boolean {
    return (
      (this.configService.get<string>(
        "DAILY_SYNC_TRANSLATIONS_ENABLED",
        "true"
      ) || "")
        .toLowerCase() === "true"
    );
  }

  private async syncMovieTranslationsByTmdbId(movieId: number): Promise<void> {
    for (const language of TRANSLATION_LANGUAGES) {
      try {
        await this.delay(120);
        const translatedMovie = await this.tmdbService.getMovieDetails(
          movieId,
          language
        );

        await this.translationRepository.upsert(
          movieId,
          "movie",
          language,
          translatedMovie.title || null,
          translatedMovie.overview || null
        );
      } catch (error) {
        this.logger.debug(
          `Translation sync skipped for movie ${movieId} (${language}): ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }

  private async syncTVTranslationsByTmdbId(tvId: number): Promise<void> {
    for (const language of TRANSLATION_LANGUAGES) {
      try {
        await this.delay(120);
        const translatedTV = await this.tmdbService.getTVSeriesDetails(
          tvId,
          language
        );

        await this.translationRepository.upsert(
          tvId,
          "tv",
          language,
          translatedTV.name || null,
          translatedTV.overview || null
        );
      } catch (error) {
        this.logger.debug(
          `Translation sync skipped for TV ${tvId} (${language}): ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }

  /**
   * Generate TMDB daily export URL for specific date
   */
  private generateExportUrl(mediaType: string, date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();

    return `http://files.tmdb.org/p/exports/${mediaType}_ids_${month}_${day}_${year}.json.gz`;
  }

  /**
   * Find the most recent available export date by checking backwards from given date
   */
  private async findAvailableExportDate(
    mediaType: string,
    startDate: Date,
    maxDaysBack: number = 7
  ): Promise<Date | null> {
    const currentDate = new Date(startDate);

    for (let i = 0; i < maxDaysBack; i++) {
      const testDate = new Date(currentDate);
      testDate.setDate(testDate.getDate() - i);

      const url = this.generateExportUrl(mediaType, testDate);

      try {
        this.logger.log(
          `Checking availability for: ${testDate.toDateString()}`
        );

        const response = await axios({
          method: "HEAD", // Just check if file exists without downloading
          url,
          timeout: 30000,
        });

        if (response.status === 200) {
          this.logger.log(
            `Found available export for ${mediaType} on: ${testDate.toDateString()}`
          );
          return testDate;
        }
      } catch (error) {
        this.logger.debug(
          `Export not available for ${testDate.toDateString()}: ${
            error.response?.status || error.message
          }`
        );
        continue;
      }
    }

    this.logger.warn(
      `No available export found for ${mediaType} within ${maxDaysBack} days from ${startDate.toDateString()}`
    );
    return null;
  }

  /**
   * Download and parse daily export file
   */
  private async downloadAndParseDailyExport(
    url: string
  ): Promise<DailyExportItem[]> {
    try {
      // Simplified log - only show start
      this.logger.log(`📥 Downloading daily export...`);

      const response = await axios({
        method: "GET",
        url,
        responseType: "stream",
        timeout: 300000, // 5 minutes timeout
      });

      const items: DailyExportItem[] = [];

      // Create gunzip stream to decompress
      const gunzipStream = zlib.createGunzip();

      // Create readline interface to process line by line
      const rl = readline.createInterface({
        input: response.data.pipe(gunzipStream),
        crlfDelay: Infinity,
      });

      let lineCount = 0;

      for await (const line of rl) {
        try {
          if (line.trim()) {
            const item = JSON.parse(line) as DailyExportItem;
            items.push(item);
            lineCount++;

            // Remove detailed progress logs - no output during processing
          }
        } catch (parseError) {
          // Only log critical parse errors, suppress warnings
        }
      }

      // Only show final result
      this.logger.log(`✅ Downloaded ${items.length} items`);
      return items;
    } catch (error) {
      if (error.response?.status === 404 || error.response?.status === 403) {
        this.logger.warn(`❌ Export file not available for this date`);
        return [];
      }
      this.logger.error(`❌ Error downloading export:`, error);
      throw error;
    }
  }

  /**
   * Sync movies from daily export with batch processing
   */
  async syncMoviesFromDailyExport(
    date: Date = new Date(),
    batchSize: number = 100,
    startFromBatch: number = 0
  ): Promise<void> {
    try {
      // Find available export date
      const availableDate = await this.findAvailableExportDate("movie", date);

      if (!availableDate) {
        this.logger.error(
          `No available movie export found within 7 days from ${date.toDateString()}`
        );
        return;
      }

      const url = this.generateExportUrl("movie", availableDate);
      this.logger.log(
        `🎬 Starting movie sync for ${availableDate.toDateString()}`
      );

      const exportItems = await this.downloadAndParseDailyExport(url);

      if (exportItems.length === 0) {
        this.logger.warn("❌ No movie items found in export");
        return;
      }

      // Filter out adult content if needed
      const movieIds = exportItems
        .filter((item) => !item.adult) // Skip adult content
        .map((item) => item.id);

      this.logger.log(`📊 Processing ${movieIds.length} movies...`);

      // Process in batches
      let processedCount = 0;
      let syncedCount = 0;
      const syncTranslations = this.isTranslationSyncEnabled();

      if (syncTranslations) {
        this.logger.log(
          `🌐 Daily movie translation sync enabled for: ${TRANSLATION_LANGUAGES.join(
            ", "
          )}`
        );
      }

      // Start from specified batch
      const startIndex = startFromBatch * batchSize;
      if (startFromBatch > 0) {
        this.logger.log(`⏭️ Resuming from batch ${startFromBatch + 1}`);
      }

      for (let i = startIndex; i < movieIds.length; i += batchSize) {
        const batch = movieIds.slice(i, i + batchSize);

        // Simplified batch log - only show major milestones
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(movieIds.length / batchSize);

        // Only log every 10 batches or at key milestones
        if (batchNum % 10 === 1 || batchNum === totalBatches) {
          this.logger.log(`📈 Processing batch ${batchNum}/${totalBatches}...`);
        }

        // Process batch in parallel with rate limiting
        const promises = batch.map(async (movieId, index) => {
          try {
            // Add small delay to respect rate limits
            await this.delay(index * 50);

            const movieDetails = await this.tmdbService.getMovieDetails(
              movieId
            );
            await this.syncMovieFromDetails(movieDetails);

            if (syncTranslations) {
              await this.syncMovieTranslationsByTmdbId(movieId);
            }

            return true;
          } catch (error) {
            // Suppress individual movie errors to reduce log noise
            return false;
          }
        });

        const results = await Promise.allSettled(promises);
        const batchSyncedCount = results.filter(
          (r) => r.status === "fulfilled" && r.value
        ).length;

        processedCount += batch.length;
        syncedCount += batchSyncedCount;

        // Remove detailed batch completion logs

        // Delay between batches
        await this.delay(1000);
      }

      this.logger.log(
        `✅ Movie sync completed: ${syncedCount}/${processedCount} movies synced`
      );
    } catch (error) {
      this.logger.error("❌ Error syncing movies:", error);
      throw error;
    }
  }

  /**
   * Sync TV series from daily export with batch processing
   */
  async syncTVFromDailyExport(
    date: Date = new Date(),
    batchSize: number = 100,
    startFromBatch: number = 0
  ): Promise<void> {
    try {
      // Find available export date
      const availableDate = await this.findAvailableExportDate(
        "tv_series",
        date
      );

      if (!availableDate) {
        this.logger.error(
          `No available TV series export found within 7 days from ${date.toDateString()}`
        );
        return;
      }

      const url = this.generateExportUrl("tv_series", availableDate);
      this.logger.log(
        `📺 Starting TV series sync for ${availableDate.toDateString()}`
      );

      const exportItems = await this.downloadAndParseDailyExport(url);

      if (exportItems.length === 0) {
        this.logger.warn("❌ No TV series items found in export");
        return;
      }

      const tvIds = exportItems.map((item) => item.id);
      this.logger.log(`📊 Processing ${tvIds.length} TV series...`);

      // Process in batches
      let processedCount = 0;
      let syncedCount = 0;
      const syncTranslations = this.isTranslationSyncEnabled();

      if (syncTranslations) {
        this.logger.log(
          `🌐 Daily TV translation sync enabled for: ${TRANSLATION_LANGUAGES.join(
            ", "
          )}`
        );
      }

      // Start from specified batch
      const startIndex = startFromBatch * batchSize;
      if (startFromBatch > 0) {
        this.logger.log(`⏭️ Resuming from batch ${startFromBatch + 1}`);
      }

      for (let i = startIndex; i < tvIds.length; i += batchSize) {
        const batch = tvIds.slice(i, i + batchSize);

        // Simplified batch log - only show major milestones
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(tvIds.length / batchSize);

        // Only log every 10 batches or at key milestones
        if (batchNum % 10 === 1 || batchNum === totalBatches) {
          this.logger.log(`📈 Processing batch ${batchNum}/${totalBatches}...`);
        }

        // Process batch in parallel with rate limiting
        const promises = batch.map(async (tvId, index) => {
          try {
            // Add small delay to respect rate limits
            await this.delay(index * 50);

            const tvDetails = await this.tmdbService.getTVSeriesDetails(tvId);
            await this.syncTVFromDetails(tvDetails);

            if (syncTranslations) {
              await this.syncTVTranslationsByTmdbId(tvId);
            }

            return true;
          } catch (error) {
            // Suppress individual TV series errors to reduce log noise
            return false;
          }
        });

        const results = await Promise.allSettled(promises);
        const batchSyncedCount = results.filter(
          (r) => r.status === "fulfilled" && r.value
        ).length;

        processedCount += batch.length;
        syncedCount += batchSyncedCount;

        // Remove detailed batch completion logs

        // Delay between batches
        await this.delay(1000);
      }

      this.logger.log(
        `✅ TV series sync completed: ${syncedCount}/${processedCount} TV series synced`
      );
    } catch (error) {
      this.logger.error("❌ Error syncing TV series:", error);
      throw error;
    }
  }

  /**
   * Sync all content types from daily export
   */
  async syncAllFromDailyExport(date: Date = new Date()): Promise<void> {
    this.logger.log(`🚀 Starting full sync for ${date.toDateString()}`);

    const startTime = Date.now();

    try {
      // Run movie and TV sync in parallel
      await Promise.all([
        this.syncMoviesFromDailyExport(date),
        this.syncTVFromDailyExport(date),
      ]);

      const duration = Date.now() - startTime;
      this.logger.log(
        `🎉 Full sync completed in ${Math.round(duration / 1000)}s`
      );
    } catch (error) {
      this.logger.error("❌ Full sync failed:", error);
      throw error;
    }
  }

  /**
   * Sync from most recent available export date
   */
  async syncTodayExports(): Promise<void> {
    // Start from current date and find most recent available export
    const today = new Date();
    this.logger.log(
      `🔍 Searching for latest exports from ${today.toDateString()}`
    );
    await this.syncAllFromDailyExport(today);
  }

  /**
   * Sync movie from TMDB details
   */
  private async syncMovieFromDetails(tmdbMovie: TMDBMovie): Promise<void> {
    try {
      const movieData: Partial<Movie> = {
        title: tmdbMovie.title,
        originalTitle: tmdbMovie.original_title,
        overview: tmdbMovie.overview,
        posterPath: tmdbMovie.poster_path,
        backdropPath: tmdbMovie.backdrop_path,
        releaseDate: tmdbMovie.release_date
          ? new Date(tmdbMovie.release_date)
          : null,
        voteAverage: tmdbMovie.vote_average,
        voteCount: tmdbMovie.vote_count,
        popularity: tmdbMovie.popularity,
        genreIds: tmdbMovie.genre_ids,
        originalLanguage: tmdbMovie.original_language,
        adult: tmdbMovie.adult,
      };

      await this.movieRepository.upsertByTmdbId(tmdbMovie.id, movieData);
    } catch (error) {
      this.logger.error(`Error syncing movie ${tmdbMovie.id}:`, error);
      throw error;
    }
  }

  /**
   * Sync TV series from TMDB details
   */
  private async syncTVFromDetails(tmdbTV: TMDBTVSeries): Promise<void> {
    try {
      const tvData: Partial<TVSeries> = {
        title: tmdbTV.name,
        originalTitle: tmdbTV.original_name,
        overview: tmdbTV.overview,
        posterPath: tmdbTV.poster_path,
        backdropPath: tmdbTV.backdrop_path,
        releaseDate: tmdbTV.first_air_date
          ? new Date(tmdbTV.first_air_date)
          : null,
        voteAverage: tmdbTV.vote_average,
        voteCount: tmdbTV.vote_count,
        popularity: tmdbTV.popularity,
        genreIds: tmdbTV.genre_ids,
        originalLanguage: tmdbTV.original_language,
        firstAirDate: tmdbTV.first_air_date
          ? new Date(tmdbTV.first_air_date)
          : null,
        originCountry: tmdbTV.origin_country,
        numberOfSeasons: tmdbTV.number_of_seasons ?? null,
        numberOfEpisodes: tmdbTV.number_of_episodes ?? null,
      };

      await this.tvSeriesRepository.upsertByTmdbId(tmdbTV.id, tvData);
    } catch (error) {
      this.logger.error(`Error syncing TV series ${tmdbTV.id}:`, error);
      throw error;
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<{
    totalMovies: number;
    totalTVSeries: number;
    lastSyncDate: string;
  }> {
    const [movieResult, tvResult] = await Promise.all([
      this.movieRepository.findAll(1, 1),
      this.tvSeriesRepository.findAll(1, 1),
    ]);

    return {
      totalMovies: movieResult.pagination.total,
      totalTVSeries: tvResult.pagination.total,
      lastSyncDate: new Date().toISOString(),
    };
  }
}
