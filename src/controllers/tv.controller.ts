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
import { TVSeriesService } from "../services/tv-series.service";
import { TMDBService } from "../services/tmdb.service";
import { TVQueryDto } from "../dto/query.dto";
import { ApiResponse } from "../interfaces/api.interface";

@Controller("tv")
export class TVController {
  constructor(
    private tvSeriesService: TVSeriesService,
    private tmdbService: TMDBService
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getTVSeries(@Query() query: TVQueryDto): Promise<ApiResponse> {
    try {
      const result = await this.tvSeriesService.findAll(
        query.page,
        query.limit,
        query.genres,
        query.year,
        query.sortBy,
        query.language || "en-US",
        query.countries
      );

      // Check if requested page exceeds available pages
      if (
        query.page > result.pagination.totalPages &&
        result.pagination.totalPages > 0
      ) {
        return {
          success: false,
          message: "Failed to retrieve TV series",
          error: `Page ${query.page} exceeds available pages. Maximum available page is ${result.pagination.totalPages}.`,
          data: {
            retryable: false,
            errorType: "PageExceeded",
            availablePages: result.pagination.totalPages,
            total: result.pagination.total,
          },
        };
      }

      return {
        success: true,
        message: "TV series retrieved successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve TV series",
        error: error.message,
      };
    }
  }

  @Get("on-the-air")
  @HttpCode(HttpStatus.OK)
  async getOnTheAir(@Query() query: TVQueryDto): Promise<ApiResponse> {
    try {
      const { page = 1, limit = 6, language = "en-US" } = query;

      const result = await this.tvSeriesService.getOnTheAirTVSeries(
        page,
        limit,
        language
      );

      // Transform response to include media_type
      const transformedResults = result.data.map((tv) => ({
        ...tv,
        media_type: "tv", // Add media type to distinguish from movies
      }));

      return {
        success: true,
        message: `On the air TV series retrieved successfully`,
        data: transformedResults,
        pagination: {
          page: result.pagination.page,
          limit: limit,
          total: result.pagination.total,
          totalPages: result.pagination.totalPages,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve on the air TV series",
        error: error.message,
        data: [],
      };
    }
  }

  @Get("popular-tv")
  @HttpCode(HttpStatus.OK)
  async getPopularTV(@Query() query: TVQueryDto): Promise<ApiResponse> {
    try {
      const { page = 1, limit = 6, language = "en-US" } = query;

      const result = await this.tvSeriesService.getPopularTVSeries(
        page,
        limit,
        language
      );

      // Transform response to include media_type
      const transformedResults = result.data.map((tv) => ({
        ...tv,
        media_type: "tv", // Add media type to distinguish from movies
      }));

      return {
        success: true,
        message: `Popular TV series retrieved successfully`,
        data: transformedResults,
        pagination: {
          page: result.pagination.page,
          limit: limit,
          total: result.pagination.total,
          totalPages: result.pagination.totalPages,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve popular TV series",
        error: error.message,
        data: [],
      };
    }
  }

  @Get("top-rated-tv")
  @HttpCode(HttpStatus.OK)
  async getTopRatedTV(@Query() query: TVQueryDto): Promise<ApiResponse> {
    try {
      const { page = 1, limit = 6, language = "en-US" } = query;

      const result = await this.tvSeriesService.getTopRatedTVSeries(
        page,
        limit,
        language
      );

      // Transform response to include media_type
      const transformedResults = result.data.map((tv) => ({
        ...tv,
        media_type: "tv", // Add media type to distinguish from movies
      }));

      return {
        success: true,
        message: `Top rated TV series retrieved successfully`,
        data: transformedResults,
        pagination: {
          page: result.pagination.page,
          limit: limit,
          total: result.pagination.total,
          totalPages: result.pagination.totalPages,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve top rated TV series",
        error: error.message,
        data: [],
      };
    }
  }

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  async getTVSeriesById(
    @Param("id", ParseIntPipe) id: number
  ): Promise<ApiResponse> {
    try {
      // Use TMDB ID as primary identifier
      const tvSeries = await this.tvSeriesService.findByTmdbId(id);

      return {
        success: true,
        message: "TV series retrieved successfully",
        data: tvSeries,
      };
    } catch (error) {
      const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      return {
        success: false,
        message: error.message || "Failed to retrieve TV series",
        error: error.message,
      };
    }
  }

  @Get(":id/credits")
  @HttpCode(HttpStatus.OK)
  async getTVCredits(
    @Param("id", ParseIntPipe) id: number,
    @Query("language") language: string = "en-US"
  ): Promise<ApiResponse> {
    try {
      const credits = await this.tvSeriesService.getTVCredits(id, language);

      return {
        success: true,
        message: "TV credits retrieved successfully",
        data: credits,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve TV credits",
        error: error.message,
      };
    }
  }

  @Get(":id/seasons/:season/episodes")
  @HttpCode(HttpStatus.OK)
  async getSeasonEpisodes(
    @Param("id", ParseIntPipe) id: number,
    @Param("season", ParseIntPipe) season: number,
    @Query("language") language: string = "en-US"
  ): Promise<ApiResponse> {
    try {
      const seasonDetails = await this.tvSeriesService.getSeasonEpisodes(
        id,
        season,
        language
      );

      return {
        success: true,
        message: "Season episodes retrieved successfully",
        data: seasonDetails,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve season episodes",
        error: error.message,
      };
    }
  }

  @Get(":id/videos")
  @HttpCode(HttpStatus.OK)
  async getTVVideos(
    @Param("id", ParseIntPipe) id: number
  ): Promise<ApiResponse> {
    try {
      const videos = await this.tmdbService.getTVVideos(id);

      return {
        success: true,
        message: "TV videos retrieved successfully",
        data: videos,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve TV videos",
        error: error.message,
        data: null,
      };
    }
  }

  @Get(":id/recommendations")
  @HttpCode(HttpStatus.OK)
  async getTVRecommendations(
    @Param("id", ParseIntPipe) id: number,
    @Query("page") page: number = 1
  ): Promise<ApiResponse> {
    try {
      const recommendations = await this.tvSeriesService.getRecommendations(
        id,
        page
      );

      return {
        success: true,
        message: "TV recommendations retrieved successfully",
        data: recommendations,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve TV recommendations",
        error: error.message,
        data: [],
      };
    }
  }
}
