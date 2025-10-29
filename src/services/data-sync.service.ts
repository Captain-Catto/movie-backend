import { Injectable, Logger } from "@nestjs/common";
import {
  TMDBService,
  TMDBMovie,
  TMDBTVSeries,
  TMDBTrending,
} from "./tmdb.service";
import { MovieRepository } from "../repositories/movie.repository";
import { TVSeriesRepository } from "../repositories/tv-series.repository";
import { TrendingRepository } from "../repositories/trending.repository";
import { Movie } from "../entities/movie.entity";
import { TVSeries } from "../entities/tv-series.entity";
import { Trending, MediaType } from "../entities/trending.entity";
import { TMDB_MAX_PAGES } from "../constants/tmdb.constants";

type TrendingHiddenState = {
  isHidden: boolean;
  hiddenReason: string | null;
  hiddenAt: Date | null;
};

@Injectable()
export class DataSyncService {
  private readonly logger = new Logger(DataSyncService.name);

  constructor(
    private tmdbService: TMDBService,
    private movieRepository: MovieRepository,
    private tvSeriesRepository: TVSeriesRepository,
    private trendingRepository: TrendingRepository
  ) {}

  async syncPopularMovies(language: string = "en-US"): Promise<void> {
    try {
      this.logger.log(
        `Starting popular movies sync with language: ${language}...`
      );

      let currentPage = 1;
      let totalPages = 1;

      // Fetch all available pages dynamically
      do {
        const response = await this.tmdbService.getPopularMovies(
          currentPage,
          language
        );

        // Get total pages from first response
        if (currentPage === 1 && response.total_pages > 0) {
          totalPages = response.total_pages;
          this.logger.log(
            `Found ${response.total_results} total movies across ${totalPages} pages`
          );
        }

        if (response.results.length === 0) {
          this.logger.log(`No more movies found at page ${currentPage}`);
          break;
        }

        this.logger.log(
          `Syncing page ${currentPage} with ${response.results.length} movies`
        );

        for (const tmdbMovie of response.results) {
          await this.syncMovie(tmdbMovie);
        }

        currentPage++;

        // Add delay to respect rate limits
        await this.delay(500);

        // TMDB API limit to prevent errors
        if (currentPage > TMDB_MAX_PAGES) {
          this.logger.warn(`Reached TMDB API limit of ${TMDB_MAX_PAGES} pages`);
          break;
        }
      } while (true);

      this.logger.log(
        `Popular movies sync completed. Synced ${currentPage - 1} pages`
      );
    } catch (error) {
      this.logger.error("Error syncing popular movies:", error);
    }
  }

  async syncPopularTVSeries(language: string = "en-US"): Promise<void> {
    try {
      this.logger.log(
        `Starting popular TV series sync with language: ${language}...`
      );

      let currentPage = 1;

      // Fetch all available pages dynamically
      do {
        const response = await this.tmdbService.getPopularTVSeries(
          currentPage,
          language
        );

        // Get total pages from first response
        if (currentPage === 1 && response.total_pages > 0) {
          this.logger.log(
            `Found ${response.total_results} total TV series across ${response.total_pages} pages`
          );
        }

        if (response.results.length === 0) {
          this.logger.log(`No more TV series found at page ${currentPage}`);
          break;
        }

        this.logger.log(
          `Syncing page ${currentPage} with ${response.results.length} TV series`
        );

        for (const tmdbTV of response.results) {
          await this.syncTVSeries(tmdbTV);
        }

        currentPage++;

        // Add delay to respect rate limits
        await this.delay(500);

        // TMDB API limit to prevent errors
        if (currentPage > TMDB_MAX_PAGES) {
          this.logger.warn(
            `Reached TMDB API limit of ${TMDB_MAX_PAGES} pages for TV series`
          );
          break;
        }
      } while (true);

      this.logger.log(
        `Popular TV series sync completed. Synced ${currentPage - 1} pages`
      );
    } catch (error) {
      this.logger.error("Error syncing popular TV series:", error);
    }
  }

  async syncTrending(language: string = "en-US"): Promise<void> {
    try {
      this.logger.log(`Starting trending sync with language: ${language}...`);

      const existing = await this.trendingRepository.findAll(
        1,
        1000,
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

      const trendingItems = await this.tmdbService.getTrending(
        "all",
        "week",
        language
      );

      for (const item of trendingItems) {
        const mediaType =
          item.media_type === "movie" ? MediaType.MOVIE : MediaType.TV;
        const hiddenState = hiddenStateMap.get(`${item.id}:${mediaType}`);
        await this.syncTrendingItem(item, mediaType, hiddenState);
      }

      this.logger.log("Trending sync completed");
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
}
