import {
  Controller,
  Get,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
} from "@nestjs/common";
import { TMDBService } from "../services/tmdb.service";
import { PeopleCacheService } from "../services/people-cache.service";
import { ApiResponse } from "../interfaces/api.interface";
import { ApiExcludeEndpoint, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";
import { Roles } from "../decorators/roles.decorator";
import { UserRole } from "../entities/user.entity";
import {
  ApiPaginationQueries,
  ApiStandardErrors,
  ApiSuccess,
} from "../swagger/api-response.decorators";

@ApiTags('People')
@Controller("people")
export class PeopleController {
  constructor(
    private tmdbService: TMDBService,
    private peopleCacheService: PeopleCacheService
  ) {}

  @Get("popular")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "List popular people", dataType: "People", isArray: true })
  @ApiStandardErrors()
  @ApiPaginationQueries()
  async getPopularPeople(
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(24), ParseIntPipe) limit: number
  ): Promise<ApiResponse> {
    try {
      const normalizedLimit = Math.min(Math.max(limit, 1), 100);
      const result = await this.tmdbService.getPopularPeople(
        page,
        "en-US",
        normalizedLimit
      );

      return {
        success: true,
        message: "Popular people fetched successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to fetch popular people: ${error.message}`,
        data: null,
        error: error.message,
      };
    }
  }

  @Get("search")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Search people by name", dataType: "People", isArray: true })
  @ApiStandardErrors()
  @ApiQuery({ name: "q", required: true, type: String, example: "William" })
  @ApiPaginationQueries()
  async searchPeople(
    @Query("q") query: string = "",
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(24), ParseIntPipe) limit: number
  ): Promise<ApiResponse> {
    try {
      const normalizedLimit = Math.min(Math.max(limit, 1), 100);
      const result = await this.tmdbService.searchPeople(
        query,
        page,
        "en-US",
        normalizedLimit
      );

      return {
        success: true,
        message: "People search completed successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to search people: ${error.message}`,
        data: null,
        error: error.message,
      };
    }
  }

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Get person detail by TMDB person ID", dataType: "Person detail" })
  @ApiStandardErrors({ notFound: true })
  @ApiParam({ name: "id", type: Number, example: 31 })
  async getPersonDetails(
    @Param("id", ParseIntPipe) id: number
  ): Promise<ApiResponse> {
    try {
      const result = await this.peopleCacheService.getPersonDetails(id);

      return {
        success: true,
        message: "Person details fetched successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to fetch person details: ${error.message}`,
        data: null,
        error: error.message,
      };
    }
  }

  @Get(":id/credits")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Get combined movie and TV credits for a person", dataType: "Person credits" })
  @ApiStandardErrors({ notFound: true })
  @ApiParam({ name: "id", type: Number, example: 31 })
  async getPersonCredits(
    @Param("id", ParseIntPipe) id: number
  ): Promise<ApiResponse> {
    try {
      const result = await this.tmdbService.getPersonCredits(id);

      return {
        success: true,
        message: "Person credits fetched successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to fetch person credits: ${error.message}`,
        data: null,
        error: error.message,
      };
    }
  }

  @Get(":id/credits/paginated")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Get paginated combined credits for a person", dataType: "Paginated person credits" })
  @ApiStandardErrors({ notFound: true })
  @ApiParam({ name: "id", type: Number, example: 31 })
  @ApiPaginationQueries()
  @ApiQuery({ name: "mediaType", required: false, enum: ["movie", "tv", "all"], example: "all" })
  @ApiQuery({ name: "sortBy", required: false, enum: ["release_date", "popularity", "vote_average"], example: "release_date" })
  async getPersonCreditsPaginated(
    @Param("id", ParseIntPipe) id: number,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("mediaType", new DefaultValuePipe("all")) mediaType: "movie" | "tv" | "all",
    @Query("sortBy", new DefaultValuePipe("release_date")) sortBy: "release_date" | "popularity" | "vote_average"
  ): Promise<ApiResponse> {
    try {
      // Validate parameters
      if (page < 1) page = 1;
      if (limit < 1 || limit > 100) limit = 20;

      const result = await this.peopleCacheService.getPersonCreditsPaginated(
        id,
        page,
        limit,
        mediaType,
        sortBy
      );

      return {
        success: true,
        message: `Person credits page ${page} fetched successfully`,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to fetch person credits: ${error.message}`,
        data: null,
        error: error.message,
      };
    }
  }

  @Get(":id/credits/cast/paginated")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Get paginated cast credits for a person", dataType: "Paginated cast credits" })
  @ApiStandardErrors({ notFound: true })
  @ApiParam({ name: "id", type: Number, example: 31 })
  @ApiPaginationQueries()
  @ApiQuery({ name: "mediaType", required: false, enum: ["movie", "tv", "all"], example: "all" })
  @ApiQuery({ name: "sortBy", required: false, enum: ["release_date", "popularity", "vote_average"], example: "release_date" })
  async getPersonCastPaginated(
    @Param("id", ParseIntPipe) id: number,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("mediaType", new DefaultValuePipe("all")) mediaType: "movie" | "tv" | "all",
    @Query("sortBy", new DefaultValuePipe("release_date")) sortBy: "release_date" | "popularity" | "vote_average"
  ): Promise<ApiResponse> {
    try {
      // Validate parameters
      if (page < 1) page = 1;
      if (limit < 1 || limit > 100) limit = 20;

      const result = await this.peopleCacheService.getPersonCastPaginated(
        id,
        page,
        limit,
        mediaType,
        sortBy
      );

      return {
        success: true,
        message: `Person cast page ${page} fetched successfully`,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to fetch person cast: ${error.message}`,
        data: null,
        error: error.message,
      };
    }
  }

  @Get(":id/credits/crew/paginated")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Get paginated crew credits for a person", dataType: "Paginated crew credits" })
  @ApiStandardErrors({ notFound: true })
  @ApiParam({ name: "id", type: Number, example: 31 })
  @ApiPaginationQueries()
  @ApiQuery({ name: "mediaType", required: false, enum: ["movie", "tv", "all"], example: "all" })
  @ApiQuery({ name: "sortBy", required: false, enum: ["release_date", "popularity", "vote_average"], example: "release_date" })
  async getPersonCrewPaginated(
    @Param("id", ParseIntPipe) id: number,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("mediaType", new DefaultValuePipe("all")) mediaType: "movie" | "tv" | "all",
    @Query("sortBy", new DefaultValuePipe("release_date")) sortBy: "release_date" | "popularity" | "vote_average"
  ): Promise<ApiResponse> {
    try {
      // Validate parameters
      if (page < 1) page = 1;
      if (limit < 1 || limit > 100) limit = 20;

      const result = await this.peopleCacheService.getPersonCrewPaginated(
        id,
        page,
        limit,
        mediaType,
        sortBy
      );

      return {
        success: true,
        message: `Person crew page ${page} fetched successfully`,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to fetch person crew: ${error.message}`,
        data: null,
        error: error.message,
      };
    }
  }

  @Get("poster/:tmdbId")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Resolve poster path for movie or TV content by TMDB ID", dataType: "Poster path" })
  @ApiStandardErrors({ notFound: true })
  @ApiParam({ name: "tmdbId", type: Number, example: 550 })
  @ApiQuery({ name: "type", required: false, enum: ["movie", "tv"], example: "movie" })
  async getTmdbPoster(
    @Param("tmdbId", ParseIntPipe) tmdbId: number,
    @Query("type") type: "movie" | "tv" = "movie"
  ): Promise<ApiResponse> {
    try {
      let posterPath: string | null = null;
      if (type === "tv") {
        const result = await this.tmdbService.getTVDetailsEnhanced(tmdbId);
        posterPath = (result as unknown as Record<string, unknown>).poster_path as string | null ?? null;
      } else {
        const result = await this.tmdbService.getMovieDetails(tmdbId);
        posterPath = (result as unknown as Record<string, unknown>).poster_path as string | null ?? null;
      }
      return { success: true, message: "Poster fetched", data: { posterPath } };
    } catch (error) {
      return { success: false, message: error.message, data: { posterPath: null } };
    }
  }

  /**
   * ===== ADMIN ENDPOINTS =====
   */

  @Get("admin/cache/stats")
  @ApiExcludeEndpoint()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Get people cache statistics", dataType: "People cache stats" })
  @ApiStandardErrors()
  async getCacheStats(): Promise<ApiResponse> {
    try {
      const stats = await this.peopleCacheService.getCacheStats();

      return {
        success: true,
        message: "Cache statistics retrieved successfully",
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get cache stats: ${error.message}`,
        data: null,
        error: error.message,
      };
    }
  }

  @Get("admin/cache/cleanup/:type")
  @ApiExcludeEndpoint()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Run people cache cleanup", dataType: "Cleanup result" })
  @ApiStandardErrors()
  @ApiParam({ name: "type", enum: ["light", "major"], example: "light" })
  async performCleanup(
    @Param("type") type: "light" | "major"
  ): Promise<ApiResponse> {
    try {
      if (type !== "light" && type !== "major") {
        return {
          success: false,
          message: "Invalid cleanup type. Use 'light' or 'major'",
          data: null,
          error: "Invalid cleanup type",
        };
      }

      const result = await this.peopleCacheService.performCleanup(type);

      return {
        success: true,
        message: `${type.charAt(0).toUpperCase() + type.slice(1)} cleanup completed successfully`,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to perform ${type} cleanup: ${error.message}`,
        data: null,
        error: error.message,
      };
    }
  }

  @Get("admin/cache/refresh/:id")
  @ApiExcludeEndpoint()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Refresh a person cache entry", dataType: "Refreshed person cache entry" })
  @ApiStandardErrors({ notFound: true })
  @ApiParam({ name: "id", type: Number, example: 31 })
  async forceRefreshCache(
    @Param("id", ParseIntPipe) id: number
  ): Promise<ApiResponse> {
    try {
      await this.peopleCacheService.forceRefreshPersonCache(id);

      return {
        success: true,
        message: `Cache refreshed for person ID ${id}`,
        data: { personId: id, refreshedAt: new Date().toISOString() },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to refresh cache for person ${id}: ${error.message}`,
        data: null,
        error: error.message,
      };
    }
  }
}
