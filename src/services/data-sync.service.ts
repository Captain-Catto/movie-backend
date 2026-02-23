import { Injectable, Logger } from "@nestjs/common";
import { TMDBService } from "./tmdb.service";
import {
  TMDBMovie,
  TMDBTVSeries,
  TMDBTrending,
} from "../interfaces/tmdb-api.interface";
import { MovieRepository } from "../repositories/movie.repository";
import { TVSeriesRepository } from "../repositories/tv-series.repository";
import { TrendingRepository } from "../repositories/trending.repository";
import { Movie } from "../entities/movie.entity";
import { TVSeries } from "../entities/tv-series.entity";
import { Trending, MediaType } from "../entities/trending.entity";
import { TMDB_MAX_PAGES } from "../constants/tmdb.constants";
import { SyncSettingsService } from "./sync-settings.service";

type TrendingHiddenState = {
  isHidden: boolean;
  hiddenReason: string | null;
  hiddenAt: Date | null;
};

@Injectable()
export class DataSyncService {
  private readonly logger = new Logger(DataSyncService.name);
  private readonly progressState: Record<
    "movies" | "tv",
    { lastLoggedAt: number; lastLoggedPage: number }
  > = {
    movies: { lastLoggedAt: 0, lastLoggedPage: 0 },
    tv: { lastLoggedAt: 0, lastLoggedPage: 0 },
  };
  private readonly PROGRESS_PAGE_STEP = 100;
  private readonly PROGRESS_TIME_MS = 10 * 60 * 1000; // 10 minutes

  constructor(
    private tmdbService: TMDBService,
    private movieRepository: MovieRepository,
    private tvSeriesRepository: TVSeriesRepository,
    private trendingRepository: TrendingRepository,
    private syncSettingsService: SyncSettingsService
  ) {}

  async syncPopularMovies(language: string = "en-US"): Promise<void> {
    try {
      const { movieLimit } = await this.syncSettingsService.getCatalogLimits();

      if (movieLimit === 0) {
        this.logger.log(
          "Skipping popular movies sync because movie limit is set to 0"
        );
        return;
      }

      this.logger.log(
        `Starting popular movies sync with language: ${language}...`
      );

      let currentPage = 1;
      let pageLimit = TMDB_MAX_PAGES;
      let syncedPages = 0;

      while (currentPage <= pageLimit) {
        const response = await this.tmdbService.getPopularMovies(
          currentPage,
          language
        );

        // Establish page limit on first response
        if (currentPage === 1) {
          const totalPagesFromApi = response.total_pages || 1;
          const basePageLimit = Math.min(totalPagesFromApi, TMDB_MAX_PAGES);

          if (response.results.length === 0) {
            this.logger.log(
              `No movies returned at page ${currentPage}, stopping.`
            );
            break;
          }

          const configuredPageLimit =
            movieLimit > 0
              ? Math.ceil(movieLimit / response.results.length)
              : basePageLimit;

          pageLimit = Math.min(configuredPageLimit, basePageLimit);
          this.logger.log(
            `Found ${
              response.total_results
            } total movies across ${totalPagesFromApi} pages (syncing up to ${pageLimit} pages based on limit ${
              movieLimit || "∞"
            })`
          );
        }

        if (response.results.length === 0) {
          this.logger.log(`No more movies found at page ${currentPage}`);
          break;
        }

        if (this.shouldLogProgress("movies", currentPage)) {
          this.logger.log(
            `Progress: popular movies page ${currentPage}/${pageLimit} (${response.results.length} items)`
          );
        }

        for (const tmdbMovie of response.results) {
          await this.syncMovie(tmdbMovie);
        }

        syncedPages = currentPage;
        currentPage++;

        // Add delay to respect rate limits
        await this.delay(500);
      }

      this.logger.log(
        `Popular movies sync completed. Synced ${syncedPages} pages (limit ${pageLimit}).`
      );
    } catch (error) {
      this.logger.error("Error syncing popular movies:", error);
    }
  }

  async syncPopularTVSeries(language: string = "en-US"): Promise<void> {
    try {
      const { tvLimit } = await this.syncSettingsService.getCatalogLimits();

      if (tvLimit === 0) {
        this.logger.log(
          "Skipping popular TV series sync because TV limit is set to 0"
        );
        return;
      }

      this.logger.log(
        `Starting popular TV series sync with language: ${language}...`
      );

      let currentPage = 1;
      let pageLimit = TMDB_MAX_PAGES;
      let syncedPages = 0;

      while (currentPage <= pageLimit) {
        const response = await this.tmdbService.getPopularTVSeries(
          currentPage,
          language
        );

        if (currentPage === 1) {
          const totalPagesFromApi = response.total_pages || 1;
          const basePageLimit = Math.min(totalPagesFromApi, TMDB_MAX_PAGES);

          if (response.results.length === 0) {
            this.logger.log(
              `No TV series returned at page ${currentPage}, stopping.`
            );
            break;
          }

          const configuredPageLimit =
            tvLimit > 0
              ? Math.ceil(tvLimit / response.results.length)
              : basePageLimit;

          pageLimit = Math.min(configuredPageLimit, basePageLimit);
          this.logger.log(
            `Found ${
              response.total_results
            } total TV series across ${totalPagesFromApi} pages (syncing up to ${pageLimit} pages based on limit ${
              tvLimit || "∞"
            })`
          );
        }

        if (response.results.length === 0) {
          this.logger.log(`No more TV series found at page ${currentPage}`);
          break;
        }

        if (this.shouldLogProgress("tv", currentPage)) {
          this.logger.log(
            `Progress: popular TV page ${currentPage}/${pageLimit} (${response.results.length} items)`
          );
        }

        for (const tmdbTV of response.results) {
          await this.syncTVSeries(tmdbTV);
        }

        syncedPages = currentPage;
        currentPage++;

        // Add delay to respect rate limits
        await this.delay(500);
      }

      this.logger.log(
        `Popular TV series sync completed. Synced ${syncedPages} pages (limit ${pageLimit}).`
      );
    } catch (error) {
      this.logger.error("Error syncing popular TV series:", error);
    }
  }

  async syncTrending(language: string = "en-US"): Promise<void> {
    try {
      const { trendingLimit } =
        await this.syncSettingsService.getCatalogLimits();

      if (trendingLimit === 0) {
        this.logger.log(
          "Skipping trending sync because trending limit is set to 0"
        );
        return;
      }

      this.logger.log(`Starting trending sync with language: ${language}...`);

      const hiddenSnapshotSize = Math.max(trendingLimit || 0, 1000);
      const existing = await this.trendingRepository.findAll(
        1,
        hiddenSnapshotSize,
        true
      );
      const hiddenStateMap = new Map<string, TrendingHiddenState>();
      existing.data.forEach((entry) => {
        hiddenStateMap.set(`${entry.tmdbId}:${entry.mediaType}`, {
          isHidden: entry.isHidden,
          hiddenReason: entry.hiddenReason,
          hiddenAt: entry.hiddenAt,
        });
      });

      // Clear existing trending data as it changes frequently
      await this.trendingRepository.clearAll();

      const defaultPages = 5; // previous hard-coded behavior
      let maxPages = defaultPages;
      let itemsPerPage = 20;
      let totalSynced = 0;

      for (let page = 1; page <= maxPages; page++) {
        const trendingItems = await this.tmdbService.getTrending(
          "all",
          "week",
          language,
          page
        );

        if (!trendingItems?.length) {
          this.logger.log(
            `No trending items returned at page ${page}, stopping.`
          );
          break;
        }

        if (page === 1) {
          itemsPerPage = trendingItems.length || itemsPerPage;
          if (trendingLimit > 0) {
            maxPages = Math.max(1, Math.ceil(trendingLimit / itemsPerPage));
          }
          this.logger.log(
            `Trending sync configured for up to ${maxPages} pages (~${
              maxPages * itemsPerPage
            } items) based on limit ${trendingLimit || "∞"}`
          );
        }

        const remaining =
          trendingLimit > 0 ? Math.max(trendingLimit - totalSynced, 0) : null;
        if (remaining !== null && remaining <= 0) {
          this.logger.log(
            `Reached configured trending limit (${trendingLimit}), stopping.`
          );
          break;
        }

        const itemsToProcess =
          remaining !== null
            ? trendingItems.slice(0, remaining)
            : trendingItems;

        this.logger.log(
          `Syncing trending page ${page} with ${itemsToProcess.length} items`
        );

        for (const item of itemsToProcess) {
          const mediaType =
            item.media_type === "movie" ? MediaType.MOVIE : MediaType.TV;
          const hiddenState = hiddenStateMap.get(`${item.id}:${mediaType}`);
          await this.syncTrendingItem(item, mediaType, hiddenState);
          totalSynced++;
        }

        if (remaining !== null && totalSynced >= trendingLimit) {
          this.logger.log(
            `Reached configured trending limit (${trendingLimit}), stopping.`
          );
          break;
        }

        // brief delay to respect TMDB limits
        await this.delay(400);
      }

      this.logger.log(
        `Trending sync completed. Synced ${totalSynced} items (page cap ${maxPages}).`
      );
    } catch (error) {
      this.logger.error("Error syncing trending:", error);
    }
  }

  private async syncMovie(tmdbMovie: TMDBMovie): Promise<void> {
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
    }
  }

  private async syncTVSeries(tmdbTV: TMDBTVSeries): Promise<void> {
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
    }
  }

  private async syncTrendingItem(
    item: TMDBTrending,
    mediaType: MediaType,
    hiddenState?: TrendingHiddenState
  ): Promise<void> {
    try {
      const title = item.title || item.name;
      const releaseDate = item.release_date || item.first_air_date;

      const trendingData: Partial<Trending> = {
        title,
        overview: item.overview,
        posterPath: item.poster_path,
        backdropPath: item.backdrop_path,
        releaseDate: releaseDate ? new Date(releaseDate) : null,
        voteAverage: item.vote_average,
        voteCount: item.vote_count,
        popularity: item.popularity,
        genreIds: item.genre_ids,
        originalLanguage: item.original_language,
        adult: item.adult || false,
        isHidden: hiddenState?.isHidden ?? false,
        hiddenReason:
          hiddenState?.isHidden ?? false
            ? hiddenState?.hiddenReason ?? null
            : null,
        hiddenAt:
          hiddenState?.isHidden ?? false
            ? hiddenState?.hiddenAt ?? new Date()
            : null,
      };

      await this.trendingRepository.upsertByTmdbIdAndType(
        item.id,
        mediaType,
        trendingData
      );
    } catch (error) {
      this.logger.error(`Error syncing trending item ${item.id}:`, error);
    }
  }

  async syncAll(language: string = "en-US"): Promise<void> {
    this.logger.log(`Starting full data sync with language: ${language}...`);

    await Promise.all([
      this.syncPopularMovies(language),
      this.syncPopularTVSeries(language),
      this.syncTrending(language),
    ]);

    this.logger.log("Full data sync completed");
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private shouldLogProgress(
    type: "movies" | "tv",
    currentPage: number
  ): boolean {
    const state = this.progressState[type];
    const now = Date.now();

    const pageStepReached =
      currentPage === 1 ||
      currentPage === state.lastLoggedPage ||
      currentPage - state.lastLoggedPage >= this.PROGRESS_PAGE_STEP;
    const timeElapsed = now - state.lastLoggedAt >= this.PROGRESS_TIME_MS;

    if (pageStepReached || timeElapsed) {
      state.lastLoggedPage = currentPage;
      state.lastLoggedAt = now;
      return true;
    }

    return false;
  }
}
