import {
  Controller,
  Get,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  BadRequestException,
  HttpException,
  ParseIntPipe,
} from "@nestjs/common";
import { MovieService } from "../services/movie.service";
import { TVSeriesService } from "../services/tv-series.service";
import { ApiResponse } from "../interfaces/api.interface";
import {
  StreamContentType,
  StreamEmbedService,
} from "../services/stream-embed.service";

@Controller("content")
export class ContentController {
  constructor(
    private movieService: MovieService,
    private tvSeriesService: TVSeriesService,
    private streamEmbedService: StreamEmbedService
  ) {}

  @Get("stream-url/:tmdbId")
  @HttpCode(HttpStatus.OK)
  async getStreamUrl(
    @Param("tmdbId", ParseIntPipe) tmdbId: number,
    @Query("contentType") contentType: StreamContentType = "movie",
    @Query("season") season?: string,
    @Query("episode") episode?: string,
    @Query("dsLang") dsLang: string = "vi",
    @Query("autoplay") autoplay?: string,
    @Query("autoNext") autoNext?: string
  ): Promise<ApiResponse> {
    try {
      if (contentType !== "movie" && contentType !== "tv") {
        throw new BadRequestException(
          "Invalid contentType. Must be 'movie' or 'tv'"
        );
      }

      const parsedSeason = season ? Number(season) : undefined;
      const parsedEpisode = episode ? Number(episode) : undefined;

      if (parsedSeason !== undefined && (!Number.isInteger(parsedSeason) || parsedSeason < 1)) {
        throw new BadRequestException("season must be a positive integer");
      }
      if (parsedEpisode !== undefined && (!Number.isInteger(parsedEpisode) || parsedEpisode < 1)) {
        throw new BadRequestException("episode must be a positive integer");
      }
      if (
        contentType === "tv" &&
        ((parsedSeason && !parsedEpisode) || (!parsedSeason && parsedEpisode))
      ) {
        throw new BadRequestException(
          "season and episode must be provided together"
        );
      }

      const normalizedAutoplay =
        autoplay === undefined ? undefined : autoplay !== "0";
      const normalizedAutoNext =
        autoNext === undefined ? undefined : autoNext !== "0";

      const streamData = this.streamEmbedService.buildStreamUrls({
        tmdbId,
        contentType,
        season: parsedSeason,
        episode: parsedEpisode,
        dsLang,
        autoplay: normalizedAutoplay,
        autoNext: normalizedAutoNext,
      });

      return {
        success: true,
        message: "Stream URL generated successfully",
        data: streamData,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      return {
        success: false,
        message: `Failed to build stream URL: ${error.message}`,
        error: error.message,
        data: null,
      };
    }
  }

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
