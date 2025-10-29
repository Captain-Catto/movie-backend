import {
  Controller,
  Get,
  Param,
  HttpStatus,
  HttpCode,
  ParseIntPipe,
} from "@nestjs/common";
import { MovieService } from "../services/movie.service";
import { TVSeriesService } from "../services/tv-series.service";
import { ApiResponse } from "../interfaces/api.interface";

@Controller("content")
export class ContentController {
  constructor(
    private movieService: MovieService,
    private tvSeriesService: TVSeriesService
  ) {}

  @Get("lookup/tmdb/:tmdbId")
  @HttpCode(HttpStatus.OK)
  async lookupByTmdbId(
    @Param("tmdbId", ParseIntPipe) tmdbId: number
  ): Promise<ApiResponse> {
    try {
      // Try movie first
      const movieId = await this.movieService.findInternalIdByTmdbId(tmdbId);
      if (movieId) {
        return {
          success: true,
          message: "Found movie by TMDB ID",
          data: {
            internalId: movieId,
            tmdbId,
            contentType: "movie",
            redirectUrl: `/movie/${movieId}`,
          },
        };
      }

      // Try TV series
      const tvId = await this.tvSeriesService.findInternalIdByTmdbId(tmdbId);
      if (tvId) {
        return {
          success: true,
          message: "Found TV series by TMDB ID",
          data: {
            internalId: tvId,
            tmdbId,
            contentType: "tv",
            redirectUrl: `/movie/${tvId}`, // Use unified /movie route as per current setup
          },
        };
      }

      return {
        success: false,
        message: `Content with TMDB ID ${tmdbId} not found in database`,
        data: null,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to lookup content: ${error.message}`,
        data: null,
        error: error.message,
      };
    }
  }
}