import {
  Controller,
  Get,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  ParseIntPipe,
  DefaultValuePipe,
} from "@nestjs/common";
import { TMDBService } from "../services/tmdb.service";
import { PeopleCacheService } from "../services/people-cache.service";
import { ApiResponse } from "../interfaces/api.interface";

@Controller("people")
export class PeopleController {
  constructor(
    private tmdbService: TMDBService,
    private peopleCacheService: PeopleCacheService
  ) {}

  @Get("popular")
  @HttpCode(HttpStatus.OK)
  async getPopularPeople(
    @Query("page") page: number = 1
  ): Promise<ApiResponse> {
    try {
      const result = await this.tmdbService.getPopularPeople(page);

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

  @Get(":id")
  @HttpCode(HttpStatus.OK)
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

  /**
   * ===== ADMIN ENDPOINTS =====
   */

  @Get("admin/cache/stats")
  @HttpCode(HttpStatus.OK)
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
  @HttpCode(HttpStatus.OK)
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
  @HttpCode(HttpStatus.OK)
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
