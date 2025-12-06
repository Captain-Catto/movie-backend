import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";
import {
  TMDBMovie,
  TMDBTVSeries,
  TMDBTrending,
  TMDBPaginatedResponse,
  TMDBMovieResponse,
  TMDBTVResponse,
  TMDBTrendingResponse,
  TMDBCast,
  TMDBCrew,
  TMDBCredits,
  TMDBPerson,
  TMDBPersonDetails,
  TMDBPersonCredits,
  PaginatedPersonCredits,
  TMDBPeopleResponse,
  TMDBVideo,
  TMDBVideosResponse,
  TMDBMovieDetails,
  TMDBTVDetails,
} from "../interfaces/tmdb-api.interface";

@Injectable()
export class TMDBService {
  private readonly logger = new Logger(TMDBService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly enableDebugLogs: boolean;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>("TMDB_API_KEY");
    this.baseUrl = this.configService.get<string>("TMDB_BASE_URL");
    this.enableDebugLogs =
      (this.configService.get<string>("TMDB_DEBUG_LOGS") || "").toLowerCase() ===
      "true";

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      params: {
        api_key: this.apiKey,
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Add retry count using a custom property (TypeScript safe)
        (config as any).retryCount = (config as any).retryCount || 0;

        if (this.enableDebugLogs) {
          this.logger.debug(
            `Making TMDB request: ${config.method?.toUpperCase()} ${config.url}`,
            {
              params: config.params,
              page: config.params?.page,
              retryCount: (config as any).retryCount,
            }
          );
        }
        return config;
      },
      (error) => {
        this.logger.error("TMDB Request setup error:", {
          message: error.message,
          url: error.config?.url,
        });
        return Promise.reject(error);
      }
    );

    // Response interceptor with enhanced error handling
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Log successful responses for monitoring
        if (this.enableDebugLogs) {
          this.logger.debug(`TMDB API success: ${response.config.url}`, {
            status: response.status,
            page: response.data?.page,
            totalPages: response.data?.total_pages,
            results: response.data?.results?.length,
          });
        }
        return response;
      },
      async (error) => {
        const config = error.config;
        const retryCount = (config as any)?.retryCount || 0;
        const maxRetries = 3;

        // Enhanced logging
        this.logger.error("TMDB API Error:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: config?.url,
          method: config?.method,
          retryCount,
          message: error.message,
          responseData: error.response?.data,
        });

        // Rate limiting (429) - exponential backoff
        if (error.response?.status === 429 && retryCount < maxRetries) {
          const backoffTime = Math.min(1000 * Math.pow(2, retryCount), 10000);

          this.logger.warn(
            `Rate limit exceeded. Retrying after ${backoffTime}ms (attempt ${
              retryCount + 1
            }/${maxRetries})`
          );

          await this.delay(backoffTime);
          (config as any).retryCount = retryCount + 1;
          return this.axiosInstance.request(config);
        }

        // Server errors (5xx) - retry with backoff
        if (
          error.response?.status >= 500 &&
          error.response?.status < 600 &&
          retryCount < maxRetries
        ) {
          const backoffTime = 1000 * (retryCount + 1);

          this.logger.warn(
            `Server error ${
              error.response.status
            }. Retrying after ${backoffTime}ms (attempt ${
              retryCount + 1
            }/${maxRetries})`
          );

          await this.delay(backoffTime);
          (config as any).retryCount = retryCount + 1;
          return this.axiosInstance.request(config);
        }

        // Network errors - retry once
        if (!error.response && retryCount < 1) {
          this.logger.warn(
            `Network error. Retrying once (attempt ${retryCount + 1}/1)`
          );

          await this.delay(2000);
          (config as any).retryCount = retryCount + 1;
          return this.axiosInstance.request(config);
        }

        // Client errors (4xx) - don't retry, but log appropriately
        if (error.response?.status >= 400 && error.response?.status < 500) {
          if (error.response.status === 401) {
            this.logger.error("TMDB API Authentication failed - check API key");
          } else if (error.response.status === 404) {
            this.logger.warn("TMDB API endpoint not found:", config?.url);
          } else {
            this.logger.warn("TMDB API client error:", {
              status: error.response.status,
              url: config?.url,
              data: error.response.data,
            });
          }
        }

        // Max retries exceeded
        if (retryCount >= maxRetries) {
          this.logger.error(
            `Max retries (${maxRetries}) exceeded for TMDB API request:`,
            config?.url
          );
        }

        return Promise.reject(error);
      }
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Health check for TMDB API
   */
  async healthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      await this.axiosInstance.get("/movie/popular", {
        params: { page: 1 },
        timeout: 5000, // 5 second timeout for health check
      });

      const responseTime = Date.now() - startTime;

      return {
        status: responseTime < 2000 ? "healthy" : "degraded",
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        status: "unhealthy",
        responseTime,
        error: error.message || "Unknown error",
      };
    }
  }

  /**
   * Get API usage statistics
   */
  getApiStats(): {
    baseUrl: string;
    hasApiKey: boolean;
    timeout: number;
  } {
    return {
      baseUrl: this.baseUrl,
      hasApiKey: !!this.apiKey,
      timeout: 10000,
    };
  }

  /**
   * Get full image URL from TMDB image path
   * @param imagePath - The path from TMDB API (e.g., "/36xXlhEpQqVVPuiZhfoQuaY4OlA.jpg")
   * @param size - Image size (w92, w154, w185, w342, w500, w780, original)
   * @returns Full image URL
   */
  getImageUrl(imagePath: string, size: string = "w500"): string {
    if (!imagePath) return null;
    return `https://image.tmdb.org/t/p/${size}${imagePath}`;
  }

  /**
   * Get full poster URL (optimized for posters)
   * @param posterPath - The poster path from TMDB API
   * @param size - Poster size (w92, w154, w185, w342, w500, w780, original)
   * @returns Full poster URL
   */
  getPosterUrl(posterPath: string, size: string = "w342"): string {
    return this.getImageUrl(posterPath, size);
  }

  /**
   * Get full backdrop URL (optimized for backdrops)
   * @param backdropPath - The backdrop path from TMDB API
   * @param size - Backdrop size (w300, w780, w1280, original)
   * @returns Full backdrop URL
   */
  getBackdropUrl(backdropPath: string, size: string = "w1280"): string {
    return this.getImageUrl(backdropPath, size);
  }

  async getPopularMovies(
    page: number = 1,
    language: string = "en-US"
  ): Promise<TMDBMovieResponse> {
    try {
      const response = await this.axiosInstance.get("/movie/popular", {
        params: { page, language },
      });
      return {
        page: response.data.page,
        results: response.data.results,
        total_pages: response.data.total_pages,
        total_results: response.data.total_results,
      };
    } catch (error) {
      this.logger.error("Error fetching popular movies:", error);
      throw error;
    }
  }

  // Backward compatibility - return only results
  async getPopularMoviesResults(
    page: number = 1,
    language: string = "en-US"
  ): Promise<TMDBMovie[]> {
    const response = await this.getPopularMovies(page, language);
    return response.results;
  }

  /**
   * Get Now Playing movies
   */
  async getNowPlayingMovies(
    page: number = 1,
    language: string = "en-US"
  ): Promise<TMDBMovieResponse> {
    try {
      const response = await this.axiosInstance.get("/movie/now_playing", {
        params: { page, language },
      });
      return {
        page: response.data.page,
        results: response.data.results,
        total_pages: response.data.total_pages,
        total_results: response.data.total_results,
      };
    } catch (error) {
      this.logger.error("Error fetching now playing movies:", error);
      throw error;
    }
  }

  /**
   * Get Top Rated movies
   */
  async getTopRatedMovies(
    page: number = 1,
    language: string = "en-US"
  ): Promise<TMDBMovieResponse> {
    try {
      const response = await this.axiosInstance.get("/movie/top_rated", {
        params: { page, language },
      });
      return {
        page: response.data.page,
        results: response.data.results,
        total_pages: response.data.total_pages,
        total_results: response.data.total_results,
      };
    } catch (error) {
      this.logger.error("Error fetching top rated movies:", error);
      throw error;
    }
  }

  /**
   * Get Upcoming movies
   */
  async getUpcomingMovies(
    page: number = 1,
    language: string = "en-US"
  ): Promise<TMDBMovieResponse> {
    try {
      const response = await this.axiosInstance.get("/movie/upcoming", {
        params: { page, language },
      });
      return {
        page: response.data.page,
        results: response.data.results,
        total_pages: response.data.total_pages,
        total_results: response.data.total_results,
      };
    } catch (error) {
      this.logger.error("Error fetching upcoming movies:", error);
      throw error;
    }
  }

  async getPopularTVSeries(
    page: number = 1,
    language: string = "en-US"
  ): Promise<TMDBTVResponse> {
    try {
      const response = await this.axiosInstance.get("/tv/popular", {
        params: { page, language },
      });
      return {
        page: response.data.page,
        results: response.data.results,
        total_pages: response.data.total_pages,
        total_results: response.data.total_results,
      };
    } catch (error) {
      this.logger.error("Error fetching popular TV series:", error);
      throw error;
    }
  }

  async getOnTheAirTVSeries(
    page: number = 1,
    language: string = "en-US"
  ): Promise<TMDBTVResponse> {
    try {
      const response = await this.axiosInstance.get("/tv/on_the_air", {
        params: { page, language },
      });
      return {
        page: response.data.page,
        results: response.data.results,
        total_pages: response.data.total_pages,
        total_results: response.data.total_results,
      };
    } catch (error) {
      this.logger.error("Error fetching on the air TV series:", error);
      throw error;
    }
  }

  async getTopRatedTVSeries(
    page: number = 1,
    language: string = "en-US"
  ): Promise<TMDBTVResponse> {
    try {
      const response = await this.axiosInstance.get("/tv/top_rated", {
        params: { page, language },
      });
      return {
        page: response.data.page,
        results: response.data.results,
        total_pages: response.data.total_pages,
        total_results: response.data.total_results,
      };
    } catch (error) {
      this.logger.error("Error fetching top rated TV series:", error);
      throw error;
    }
  }

  // Backward compatibility - return only results
  async getPopularTVSeriesResults(
    page: number = 1,
    language: string = "en-US"
  ): Promise<TMDBTVSeries[]> {
    const response = await this.getPopularTVSeries(page, language);
    return response.results;
  }

  async getTrending(
    mediaType: "all" | "movie" | "tv" = "all",
    timeWindow: "day" | "week" = "week",
    language: string = "en-US",
    page: number = 1
  ): Promise<TMDBTrending[]> {
    try {
      const response = await this.axiosInstance.get(
        `/trending/${mediaType}/${timeWindow}`,
        {
          params: { language, page },
        }
      );
      return response.data.results;
    } catch (error) {
      this.logger.error("Error fetching trending:", error);
      throw error;
    }
  }

  async searchMulti(
    query: string,
    page: number = 1,
    language: string = "en-US"
  ): Promise<any> {
    try {
      const response = await this.axiosInstance.get("/search/multi", {
        params: { query, page, include_adult: false, language },
      });
      return {
        results: response.data.results || [],
        page: response.data.page || page,
        total_pages: response.data.total_pages || 0,
        total_results: response.data.total_results || 0,
      };
    } catch (error) {
      this.logger.error("Error searching multi:", error);
      throw error;
    }
  }

  async searchMovies(
    query: string,
    page: number = 1,
    language: string = "en-US"
  ): Promise<any> {
    try {
      const response = await this.axiosInstance.get("/search/movie", {
        params: { query, page, include_adult: false, language },
      });
      return {
        results: response.data.results || [],
        page: response.data.page || page,
        total_pages: response.data.total_pages || 0,
        total_results: response.data.total_results || 0,
      };
    } catch (error) {
      this.logger.error("Error searching movies:", error);
      throw error;
    }
  }

  async searchTV(
    query: string,
    page: number = 1,
    language: string = "en-US"
  ): Promise<any> {
    try {
      const response = await this.axiosInstance.get("/search/tv", {
        params: { query, page, include_adult: false, language },
      });
      return {
        results: response.data.results || [],
        page: response.data.page || page,
        total_pages: response.data.total_pages || 0,
        total_results: response.data.total_results || 0,
      };
    } catch (error) {
      this.logger.error("Error searching TV shows:", error);
      throw error;
    }
  }

  /**
   * Get movies with filters (genre, year) using discover endpoint
   */
  async getMoviesWithFilters(
    page: number = 1,
    options: {
      genres?: string;
      year?: number;
      language?: string;
      sortBy?: string;
    } = {}
  ): Promise<TMDBMovieResponse> {
    try {
      const params: any = {
        page,
        language: options.language || "en-US",
        sort_by: options.sortBy || "popularity.desc",
      };

      // Add genre filter
      if (options.genres) {
        params.with_genres = options.genres;
      }

      // Add year filter
      if (options.year) {
        params.primary_release_year = options.year;
      }

      const response = await this.axiosInstance.get("/discover/movie", {
        params,
      });

      return {
        page: response.data.page,
        results: response.data.results,
        total_pages: response.data.total_pages,
        total_results: response.data.total_results,
      };
    } catch (error) {
      this.logger.error("Error fetching filtered movies:", error);
      throw error;
    }
  }

  /**
   * Get TV series with filters (genre, year) using discover endpoint
   */
  async getTVSeriesWithFilters(
    page: number = 1,
    options: {
      genre?: string;
      year?: number;
      language?: string;
      sortBy?: string;
    } = {}
  ): Promise<TMDBTVResponse> {
    try {
      const params: any = {
        page,
        language: options.language || "en-US",
        sort_by: options.sortBy || "popularity.desc",
      };

      // Add genre filter
      if (options.genre) {
        params.with_genres = options.genre;
      }

      // Add year filter
      if (options.year) {
        params.first_air_date_year = options.year;
      }

      const response = await this.axiosInstance.get("/discover/tv", {
        params,
      });

      return {
        page: response.data.page,
        results: response.data.results,
        total_pages: response.data.total_pages,
        total_results: response.data.total_results,
      };
    } catch (error) {
      this.logger.error("Error fetching filtered TV series:", error);
      throw error;
    }
  }

  /**
   * Smart fetch - automatically choose between popular and filtered endpoints
   */
  async getSmartMovies(
    page: number = 1,
    options: {
      genres?: string;
      year?: number;
      language?: string;
      sortBy?: string;
    } = {}
  ): Promise<TMDBMovieResponse> {
    const hasFilters = options.genres || options.year;
    const { sortBy, language = "en-US" } = options;

    if (hasFilters) {
      return this.getMoviesWithFilters(page, options);
    } else {
      // Choose endpoint based on sortBy
      switch (sortBy) {
        case "now_playing":
          return this.getNowPlayingMovies(page, language);
        case "top_rated":
          return this.getTopRatedMovies(page, language);
        case "upcoming":
          return this.getUpcomingMovies(page, language);
        case "popularity":
        default:
          return this.getPopularMovies(page, language);
      }
    }
  }

  /**
   * Smart fetch for TV series
   */
  async getSmartTVSeries(
    page: number = 1,
    options: {
      genre?: string;
      year?: number;
      language?: string;
    } = {}
  ): Promise<TMDBTVResponse> {
    const hasFilters = options.genre || options.year;

    if (hasFilters) {
      return this.getTVSeriesWithFilters(page, options);
    } else {
      return this.getPopularTVSeries(page, options.language);
    }
  }

  async getMovieDetails(
    movieId: number,
    language: string = "en-US"
  ): Promise<TMDBMovie> {
    try {
      const response = await this.axiosInstance.get(`/movie/${movieId}`, {
        params: { language },
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching movie ${movieId}:`, error);
      throw error;
    }
  }

  async getTVSeriesDetails(
    tvId: number,
    language: string = "en-US"
  ): Promise<TMDBTVSeries> {
    try {
      const response = await this.axiosInstance.get(`/tv/${tvId}`, {
        params: { language },
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching TV series ${tvId}:`, error);
      throw error;
    }
  }

  async getMovieRecommendations(
    movieId: number,
    page: number = 1,
    language: string = "en-US"
  ): Promise<TMDBMovie[]> {
    try {
      const response = await this.axiosInstance.get(
        `/movie/${movieId}/recommendations`,
        {
          params: { page, language },
        }
      );
      return response.data.results || [];
    } catch (error) {
      this.logger.error(
        `Error fetching recommendations for movie ${movieId}:`,
        error
      );
      throw error;
    }
  }

  async getTVRecommendations(
    tvId: number,
    page: number = 1,
    language: string = "en-US"
  ): Promise<TMDBTVSeries[]> {
    try {
      const response = await this.axiosInstance.get(
        `/tv/${tvId}/recommendations`,
        {
          params: { page, language },
        }
      );
      return response.data.results || [];
    } catch (error) {
      this.logger.error(
        `Error fetching recommendations for TV series ${tvId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get movie credits (cast and crew)
   */
  async getMovieCredits(
    movieId: number,
    language: string = "en-US"
  ): Promise<TMDBCredits> {
    try {
      const response = await this.axiosInstance.get(
        `/movie/${movieId}/credits`,
        {
          params: { language },
        }
      );
      return {
        id: response.data.id,
        cast: response.data.cast || [],
        crew: response.data.crew || [],
      };
    } catch (error) {
      this.logger.error(`Error fetching credits for movie ${movieId}:`, error);
      throw error;
    }
  }

  /**
   * Get TV series credits (cast and crew)
   */
  async getTVCredits(
    tvId: number,
    language: string = "en-US"
  ): Promise<TMDBCredits> {
    try {
      const response = await this.axiosInstance.get(`/tv/${tvId}/credits`, {
        params: { language },
      });
      return {
        id: response.data.id,
        cast: response.data.cast || [],
        crew: response.data.crew || [],
      };
    } catch (error) {
      this.logger.error(`Error fetching credits for TV series ${tvId}:`, error);
      throw error;
    }
  }

  /**
   * Get enhanced movie details with production countries, companies, genres
   */
  async getMovieDetailsEnhanced(
    movieId: number,
    language: string = "en-US"
  ): Promise<TMDBMovieDetails> {
    try {
      const response = await this.axiosInstance.get(`/movie/${movieId}`, {
        params: { language },
      });
      return response.data;
    } catch (error) {
      this.logger.error(
        `Error fetching enhanced movie details ${movieId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get enhanced TV series details with production countries, companies, genres
   */
  async getTVDetailsEnhanced(
    tvId: number,
    language: string = "en-US"
  ): Promise<TMDBTVDetails> {
    try {
      const response = await this.axiosInstance.get(`/tv/${tvId}`, {
        params: { language },
      });
      return response.data;
    } catch (error) {
      this.logger.error(
        `Error fetching enhanced TV series details ${tvId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get movie with credits combined
   */
  async getMovieWithCredits(
    movieId: number,
    language: string = "en-US"
  ): Promise<TMDBMovieDetails & TMDBCredits> {
    try {
      const [movieDetails, credits] = await Promise.all([
        this.getMovieDetailsEnhanced(movieId, language),
        this.getMovieCredits(movieId, language),
      ]);

      return {
        ...movieDetails,
        cast: credits.cast,
        crew: credits.crew,
      };
    } catch (error) {
      this.logger.error(`Error fetching movie with credits ${movieId}:`, error);
      throw error;
    }
  }

  /**
   * Get TV series with credits combined
   */
  async getTVWithCredits(
    tvId: number,
    language: string = "en-US"
  ): Promise<TMDBTVDetails & TMDBCredits> {
    try {
      const [tvDetails, credits] = await Promise.all([
        this.getTVDetailsEnhanced(tvId, language),
        this.getTVCredits(tvId, language),
      ]);

      return {
        ...tvDetails,
        cast: credits.cast,
        crew: credits.crew,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching TV series with credits ${tvId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get popular people from TMDB
   */
  async getPopularPeople(
    page: number = 1,
    language: string = "en-US"
  ): Promise<TMDBPeopleResponse> {
    try {
      const response = await this.axiosInstance.get(`/person/popular`, {
        params: { page, language },
      });

      if (this.enableDebugLogs) {
        this.logger.log(
          `Fetched ${response.data.results.length} popular people from page ${page}`
        );
      }

      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching popular people page ${page}:`, error);
      throw error;
    }
  }

  /**
   * Get person details by ID
   */
  async getPersonDetails(
    personId: number,
    language: string = "en-US"
  ): Promise<TMDBPersonDetails> {
    try {
      const response = await this.axiosInstance.get(`/person/${personId}`, {
        params: { language },
      });

      if (this.enableDebugLogs) {
        this.logger.log(`Fetched details for person ${personId}`);
      }

      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching person details ${personId}:`, error);
      throw error;
    }
  }

  /**
   * Get person combined credits (movies + TV shows they appeared in)
   */
  async getPersonCredits(
    personId: number,
    language: string = "en-US"
  ): Promise<TMDBPersonCredits> {
    try {
      const response = await this.axiosInstance.get(
        `/person/${personId}/combined_credits`,
        {
          params: { language },
        }
      );

      this.logger.log(`Fetched credits for person ${personId}`);

      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching person credits ${personId}:`, error);
      throw error;
    }
  }

  /**
   * Get person combined credits with pagination
   */
  async getPersonCreditsPaginated(
    personId: number,
    page: number = 1,
    limit: number = 24,
    language: string = "en-US"
  ): Promise<PaginatedPersonCredits> {
    try {
      const response = await this.axiosInstance.get(
        `/person/${personId}/combined_credits`,
        {
          params: { language },
        }
      );

      const data = response.data as TMDBPersonCredits;

      // Combine and sort all credits by TIME-BASED sorting (mới nhất trước)
      const allCredits = [
        ...data.cast.map((credit) => ({ ...credit, type: "cast" as const })),
        ...data.crew.map((credit) => ({ ...credit, type: "crew" as const })),
      ].sort((a, b) => {
        // 1. Sort by release date/first_air_date DESC (mới nhất trước)
        const dateA = a.release_date || a.first_air_date || "1900-01-01";
        const dateB = b.release_date || b.first_air_date || "1900-01-01";
        const dateDiff = new Date(dateB).getTime() - new Date(dateA).getTime();

        if (dateDiff !== 0) return dateDiff;

        // 2. Fallback: Sort by vote_average DESC (credits don't have popularity)
        const voteA = a.vote_average || 0;
        const voteB = b.vote_average || 0;
        const voteDiff = voteB - voteA;

        if (voteDiff !== 0) return voteDiff;

        // 3. Final fallback: Sort by ID (consistent ordering)
        return b.id - a.id;
      });

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedCredits = allCredits.slice(startIndex, endIndex);

      // Separate back into cast and crew
      const paginatedCast = paginatedCredits
        .filter((credit) => credit.type === "cast")
        .map(({ type, ...credit }) => credit);

      const paginatedCrew = paginatedCredits
        .filter((credit) => credit.type === "crew")
        .map(({ type, ...credit }) => credit);

      const totalResults = allCredits.length;
      const totalPages = Math.ceil(totalResults / limit);

      if (this.enableDebugLogs) {
        this.logger.log(
          `Fetched paginated credits for person ${personId} - Page ${page}/${totalPages}`
        );
      }

      return {
        id: data.id,
        cast: paginatedCast,
        crew: paginatedCrew,
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_results: totalResults,
          page_size: limit,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error fetching paginated person credits ${personId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get movie videos/trailers
   */
  async getMovieVideos(
    movieId: number,
    language: string = "en-US"
  ): Promise<TMDBVideosResponse> {
    try {
      const response = await this.axiosInstance.get(
        `/movie/${movieId}/videos`,
        {
          params: { language },
        }
      );

      if (this.enableDebugLogs) {
        this.logger.log(`Fetched videos for movie ${movieId}`);
      }
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching movie videos ${movieId}:`, error);
      throw error;
    }
  }

  /**
   * Get TV series videos/trailers
   */
  async getTVVideos(
    tvId: number,
    language: string = "en-US"
  ): Promise<TMDBVideosResponse> {
    try {
      const response = await this.axiosInstance.get(`/tv/${tvId}/videos`, {
        params: { language },
      });

      if (this.enableDebugLogs) {
        this.logger.log(`Fetched videos for TV series ${tvId}`);
      }
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching TV videos ${tvId}:`, error);
      throw error;
    }
  }

  /**
   * Get YouTube trailer URL from TMDB video key
   */
  getYouTubeUrl(videoKey: string): string {
    return `https://www.youtube.com/watch?v=${videoKey}`;
  }

  /**
   * Get YouTube embed URL from TMDB video key
   */
  getYouTubeEmbedUrl(videoKey: string): string {
    return `https://www.youtube.com/embed/${videoKey}`;
  }
}
