import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Movie } from "../entities/movie.entity";
import { TVSeries } from "../entities/tv-series.entity";

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);
  private readonly tmdbApiKey = process.env.TMDB_API_KEY;
  private readonly tmdbBaseUrl = "https://api.themoviedb.org/3";
  private readonly isBearerToken = this.tmdbApiKey?.includes(".") ?? false;

  constructor(
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
    @InjectRepository(TVSeries)
    private readonly tvRepository: Repository<TVSeries>
  ) {}

  private buildTmdbRequest(
    path: string,
    language: string = "en-US"
  ): { url: string; options?: RequestInit } {
    const url = new URL(`${this.tmdbBaseUrl}${path}`);
    url.searchParams.append("language", language);

    if (this.tmdbApiKey) {
      if (this.isBearerToken) {
        return {
          url: url.toString(),
          options: {
            headers: {
              Authorization: `Bearer ${this.tmdbApiKey}`,
              Accept: "application/json",
            },
          },
        };
      }

      url.searchParams.append("api_key", this.tmdbApiKey);
    }

    return { url: url.toString() };
  }

  /**
   * Ensure movie exists in database, fetch from TMDB if not
   */
  async ensureMovieExists(tmdbId: string): Promise<Movie> {
    // First check if movie already exists
    let movie = await this.movieRepository.findOne({
      where: { tmdbId: parseInt(tmdbId) },
    });

    if (movie) {
      return movie;
    }

    // Fetch from TMDB API
    try {
      const { url, options } = this.buildTmdbRequest(`/movie/${tmdbId}`);
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status}`);
      }

      const movieData = await response.json();

      // Create new movie record
      movie = this.movieRepository.create({
        tmdbId: movieData.id,
        title: movieData.title,
        originalTitle: movieData.original_title,
        overview: movieData.overview,
        posterPath: movieData.poster_path,
        backdropPath: movieData.backdrop_path,
        releaseDate: movieData.release_date
          ? new Date(movieData.release_date)
          : null,
        voteAverage: movieData.vote_average || 0,
        voteCount: movieData.vote_count || 0,
        popularity: movieData.popularity || 0,
        genreIds: movieData.genres?.map((g: any) => g.id) || [],
        originalLanguage: movieData.original_language,
        adult: movieData.adult || false,
      });

      await this.movieRepository.save(movie);
      this.logger.log(
        `Added movie ${movieData.title} (TMDB ID: ${tmdbId}) to database`
      );

      return movie;
    } catch (error) {
      this.logger.error(`Failed to fetch movie ${tmdbId} from TMDB:`, error);
      throw error;
    }
  }

  /**
   * Ensure TV series exists in database, fetch from TMDB if not
   */
  async ensureTVSeriesExists(tmdbId: string): Promise<TVSeries> {
    // First check if TV series already exists
    let tvSeries = await this.tvRepository.findOne({
      where: { tmdbId: parseInt(tmdbId) },
    });

    if (tvSeries) {
      return tvSeries;
    }

    // Fetch from TMDB API
    try {
      const { url, options } = this.buildTmdbRequest(`/tv/${tmdbId}`);
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status}`);
      }

      const tvData = await response.json();

      // Create new TV series record
      tvSeries = this.tvRepository.create({
        tmdbId: tvData.id,
        title: tvData.name, // TV uses 'name' instead of 'title'
        originalTitle: tvData.original_name,
        overview: tvData.overview,
        posterPath: tvData.poster_path,
        backdropPath: tvData.backdrop_path,
        releaseDate: tvData.first_air_date
          ? new Date(tvData.first_air_date)
          : null,
        firstAirDate: tvData.first_air_date
          ? new Date(tvData.first_air_date)
          : null,
        voteAverage: tvData.vote_average || 0,
        voteCount: tvData.vote_count || 0,
        popularity: tvData.popularity || 0,
        genreIds: tvData.genres?.map((g: any) => g.id) || [],
        originalLanguage: tvData.original_language,
        originCountry: tvData.origin_country || [],
      });

      await this.tvRepository.save(tvSeries);
      this.logger.log(
        `Added TV series ${tvData.name} (TMDB ID: ${tmdbId}) to database`
      );

      return tvSeries;
    } catch (error) {
      this.logger.error(
        `Failed to fetch TV series ${tmdbId} from TMDB:`,
        error
      );
      throw error;
    }
  }

  /**
   * Ensure content exists based on type
   */
  async ensureContentExists(contentId: string, contentType: "movie" | "tv") {
    if (contentType === "movie") {
      return this.ensureMovieExists(contentId);
    } else {
      return this.ensureTVSeriesExists(contentId);
    }
  }
}
