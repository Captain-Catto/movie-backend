import { Controller, Post, HttpCode, HttpStatus, Query } from "@nestjs/common";
import { DataSyncService } from "../services/data-sync.service";
import { ApiResponse } from "../interfaces/api.interface";

@Controller("sync")
export class SyncController {
  constructor(private dataSyncService: DataSyncService) {}

  @Post("all")
  @HttpCode(HttpStatus.OK)
  async syncAll(@Query("language") language?: string): Promise<ApiResponse> {
    try {
      const lang = language || "en-US";

      // Sync popular movies (5 pages = ~100 movies)
      await this.dataSyncService.syncPopularMovies(lang);

      // Sync popular TV series (5 pages = ~100 TV shows)
      await this.dataSyncService.syncPopularTVSeries(lang);

      // Sync trending (1 page = ~20 items)
      await this.dataSyncService.syncTrending(lang);

      return {
        success: true,
        message: `All data sync completed successfully with language: ${lang}. Imported movies, TV series, and trending content.`,
        data: {
          language: lang,
          movies: "~100 popular movies imported",
          tvSeries: "~100 popular TV series imported",
          trending: "~20 trending items imported",
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to sync data: ${error.message}`,
        data: null,
      };
    }
  }

  @Post("movies")
  @HttpCode(HttpStatus.OK)
  async syncMovies(@Query("language") language?: string): Promise<ApiResponse> {
    try {
      const lang = language || "en-US";
      await this.dataSyncService.syncPopularMovies(lang);

      return {
        success: true,
        message: `Movies sync completed successfully with language: ${lang}`,
        data: {
          language: lang,
          result: "~100 popular movies imported",
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to sync movies: ${error.message}`,
        data: null,
      };
    }
  }

  @Post("tv")
  @HttpCode(HttpStatus.OK)
  async syncTVSeries(
    @Query("language") language?: string
  ): Promise<ApiResponse> {
    try {
      const lang = language || "en-US";
      await this.dataSyncService.syncPopularTVSeries(lang);

      return {
        success: true,
        message: `TV series sync completed successfully with language: ${lang}`,
        data: {
          language: lang,
          result: "~100 popular TV series imported",
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to sync TV series: ${error.message}`,
        data: null,
      };
    }
  }

  @Post("trending")
  @HttpCode(HttpStatus.OK)
  async syncTrending(
    @Query("language") language?: string
  ): Promise<ApiResponse> {
    try {
      const lang = language || "en-US";
      await this.dataSyncService.syncTrending(lang);

      return {
        success: true,
        message: `Trending sync completed successfully with language: ${lang}`,
        data: {
          language: lang,
          result: "~20 trending items imported",
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to sync trending: ${error.message}`,
        data: null,
      };
    }
  }
}
