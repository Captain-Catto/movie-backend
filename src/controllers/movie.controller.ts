import {
  Controller,
  Get,
  Param,
  Query,
  Post,
  HttpStatus,
  HttpCode,
  ParseIntPipe,
  UseGuards,
} from "@nestjs/common";
import { MovieService } from "../services/movie.service";
import { DataSyncService } from "../services/data-sync.service";
import { SyncStatusRepository } from "../repositories/sync-status.repository";
import { TMDBService } from "../services/tmdb.service";
import { MovieQueryDto } from "../dto/query.dto";
import { ApiResponse } from "../interfaces/api.interface";
import { SyncCategory } from "../entities/sync-status.entity";
import { ApiExcludeEndpoint, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";
import { Roles } from "../decorators/roles.decorator";
import { UserRole } from "../entities/user.entity";
import {
  ApiLanguageQuery,
  ApiPaginationQueries,
  ApiStandardErrors,
  ApiSuccess,
  ApiTmdbIdParam,
} from "../swagger/api-response.decorators";

@ApiTags('Movies')
@Controller("movies")
export class MovieController {
  constructor(
    private movieService: MovieService,
    private dataSyncService: DataSyncService,
    private syncStatusRepository: SyncStatusRepository,
    private tmdbService: TMDBService
  ) {}

  @Post("sync")
  @ApiExcludeEndpoint()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Manually sync popular movies", dataType: "Sync result" })
  @ApiStandardErrors()
  async syncMovies(): Promise<ApiResponse> {
    try {
      await this.dataSyncService.syncPopularMovies();

      return {
        success: true,
        message: "Movie sync completed successfully",
        data: null,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to sync movies: ${error.message}`,
        data: null,
      };
    }
  }

  @Get("now-playing")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "List now-playing movies", dataType: "Movies", isArray: true })
  @ApiStandardErrors()
  @ApiPaginationQueries()
  @ApiLanguageQuery()
  async getNowPlaying(
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 6,
    @Query("language") language: string = "en-US"
  ): Promise<ApiResponse> {
    try {
      const result = await this.movieService.getNowPlayingMovies(
        page,
        limit,
        language
      );

      return {
        success: true,
        message: `Now playing movies retrieved successfully`,
        data: result.data,
        pagination: result.pagination,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve now playing movies",
        error: error.message,
        data: [],
      };
    }
  }

  @Get("popular")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "List popular movies", dataType: "Movies", isArray: true })
  @ApiStandardErrors()
  @ApiPaginationQueries()
  @ApiLanguageQuery()
  async getPopular(
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 6,
    @Query("language") language: string = "en-US"
  ): Promise<ApiResponse> {
    try {
      const result = await this.movieService.getPopularMovies(
        page,
        limit,
        language
      );

      return {
        success: true,
        message: `Popular movies retrieved successfully`,
        data: result.data,
        pagination: result.pagination,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve popular movies",
        error: error.message,
        data: [],
      };
    }
  }

  @Get("top-rated")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "List top-rated movies", dataType: "Movies", isArray: true })
  @ApiStandardErrors()
  @ApiPaginationQueries()
  @ApiLanguageQuery()
  async getTopRated(
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 6,
    @Query("language") language: string = "en-US"
  ): Promise<ApiResponse> {
    try {
      const result = await this.movieService.getTopRatedMovies(
        page,
        limit,
        language
      );

      return {
        success: true,
        message: `Top rated movies retrieved successfully`,
        data: result.data,
        pagination: result.pagination,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve top rated movies",
        error: error.message,
        data: [],
      };
    }
  }

  @Get("upcoming")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "List upcoming movies", dataType: "Movies", isArray: true })
  @ApiStandardErrors()
  @ApiPaginationQueries()
  @ApiLanguageQuery()
  async getUpcoming(
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 6,
    @Query("language") language: string = "en-US"
  ): Promise<ApiResponse> {
    try {
      const result = await this.movieService.getUpcomingMovies(
        page,
        limit,
        language
      );

      return {
        success: true,
        message: `Upcoming movies retrieved successfully`,
        data: result.data,
        pagination: result.pagination,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve upcoming movies",
        error: error.message,
        data: [],
      };
    }
  }

  @Get("stats/sync")
  @ApiExcludeEndpoint()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Get movie sync cache statistics", dataType: "Movie sync stats" })
  @ApiStandardErrors()
  async getSyncStats(): Promise<ApiResponse> {
    try {
      const stats = await this.syncStatusRepository.getSyncStats(
        SyncCategory.MOVIES
      );

      return {
        success: true,
        message: "Sync statistics retrieved successfully",
        data: {
          category: "movies",
          syncStats: stats,
          description: {
            totalSyncedPages: "Number of pages already synced to database",
            lastSyncTime: "Last time any page was synced",
            totalItems: "Total movies synced across all pages",
            uniqueFilterCombinations:
              "Number of different filter combinations cached",
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve sync statistics",
        error: error.message,
      };
    }
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "List movies with filters and on-demand sync metadata", dataType: "Movies", isArray: true })
  @ApiStandardErrors()
  async getMovies(@Query() query: MovieQueryDto): Promise<ApiResponse> {
    try {
      const result = await this.movieService.findAll(
        query.page,
        query.limit,
        query.genres,
        query.year,
        query.language,
        query.sortBy,
        query.countries
      );

      // Enhanced response với lazy loading info
      const responseMessage = result.isOnDemandSync
        ? `Movies loaded on-demand for page ${query.page}`
        : `Movies retrieved from cache for page ${query.page}`;

      return {
        success: true,
        message: responseMessage,
        data: result.data, // <- Trả về movies trực tiếp
        pagination: result.pagination,
        meta: {
          isOnDemandSync: result.isOnDemandSync,
          loadedFromCache: !result.isOnDemandSync,
          page: query.page,
          appliedFilters: {
            genre: query.genres || null,
            year: query.year || null,
            language: query.language || "en-US",
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message.includes("TMDB")
          ? "Failed to fetch movies from external API"
          : "Failed to retrieve movies",
        error: error.message,
        data: {
          retryable:
            error.message.includes("TMDB") || error.message.includes("network"),
          errorType: error.name || "UnknownError",
        },
      };
    }
  }

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Get a movie detail by TMDB ID", dataType: "Movie detail" })
  @ApiStandardErrors({ notFound: true })
  @ApiTmdbIdParam()
  @ApiLanguageQuery()
  async getMovieById(
    @Param("id", ParseIntPipe) id: number,
    @Query("language") language: string = "en-US"
  ): Promise<ApiResponse> {
    try {
      // Use TMDB ID as primary identifier
      const movie = await this.movieService.findByTmdbId(id, language);

      return {
        success: true,
        message: "Movie retrieved successfully",
        data: movie,
      };
    } catch (error) {
      const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      return {
        success: false,
        message: error.message || "Failed to retrieve movie",
        error: error.message,
      };
    }
  }

  @Get(":id/credits")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Get movie credits by TMDB ID", dataType: "Movie credits" })
  @ApiStandardErrors({ notFound: true })
  @ApiTmdbIdParam()
  @ApiLanguageQuery()
  async getMovieCredits(
    @Param("id", ParseIntPipe) id: number,
    @Query("language") language: string = "en-US"
  ): Promise<ApiResponse> {
    try {
      const movieWithCredits = await this.movieService.findByTmdbIdWithCredits(
        id,
        language
      );

      return {
        success: true,
        message: "Movie credits retrieved successfully",
        data: {
          id: movieWithCredits.id,
          title: movieWithCredits.title,
          cast: movieWithCredits.cast,
          crew: movieWithCredits.crew,
          production_countries: movieWithCredits.production_countries,
          production_companies: movieWithCredits.production_companies,
          genres: movieWithCredits.genres,
          runtime: movieWithCredits.runtime,
          status: movieWithCredits.status,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to retrieve movie credits",
        error: error.message,
      };
    }
  }

  @Get(":id/videos")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Get TMDB videos/trailers for a movie", dataType: "Movie videos", isArray: true })
  @ApiStandardErrors({ notFound: true })
  @ApiTmdbIdParam()
  async getMovieVideos(
    @Param("id", ParseIntPipe) id: number
  ): Promise<ApiResponse> {
    try {
      const videos = await this.tmdbService.getMovieVideos(id);

      return {
        success: true,
        message: "Movie videos retrieved successfully",
        data: videos,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve movie videos",
        error: error.message,
        data: null,
      };
    }
  }

  @Get(":id/recommendations")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Get recommended movies for a TMDB movie ID", dataType: "Recommendations", isArray: true })
  @ApiStandardErrors({ notFound: true })
  @ApiTmdbIdParam()
  @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
  async getMovieRecommendations(
    @Param("id", ParseIntPipe) id: number,
    @Query("page") page: number = 1
  ): Promise<ApiResponse> {
    try {
      const recommendations = await this.movieService.getRecommendations(
        id,
        page
      );

      return {
        success: true,
        message: "Movie recommendations retrieved successfully",
        data: recommendations,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve movie recommendations",
        error: error.message,
        data: [],
      };
    }
  }
}
