import { Controller, Post, HttpCode, HttpStatus, Query } from "@nestjs/common";
import { DataSyncService } from "../services/data-sync.service";
import { ApiResponse } from "../interfaces/api.interface";
import { SyncSettingsService } from "../services/sync-settings.service";

@Controller("sync")
export class SyncController {
  constructor(
    private dataSyncService: DataSyncService,
    private syncSettingsService: SyncSettingsService
  ) {}

  @Post("all")
  @HttpCode(HttpStatus.OK)
  async syncAll(@Query("language") language?: string): Promise<ApiResponse> {
    try {
      const lang = language || "en-US";
      const limits = await this.syncSettingsService.getCatalogLimits();

      await this.dataSyncService.syncPopularMovies(lang);
      await this.dataSyncService.syncPopularTVSeries(lang);
      await this.dataSyncService.syncTrending(lang);

      return {
        success: true,
        message: `All data sync completed successfully with language: ${lang}. Imported movies, TV series, and trending content.`,
        data: {
          language: lang,
          movies:
            limits.movieLimit > 0
              ? `~${limits.movieLimit} popular movies targeted`
              : "Popular movies (no limit)",
          tvSeries:
            limits.tvLimit > 0
              ? `~${limits.tvLimit} popular TV series targeted`
              : "Popular TV series (no limit)",
          trending:
            limits.trendingLimit > 0
              ? `~${limits.trendingLimit} trending items targeted`
              : "Trending items (no limit)",
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
      const { movieLimit } = await this.syncSettingsService.getCatalogLimits();
      await this.dataSyncService.syncPopularMovies(lang);

      return {
        success: true,
        message: `Movies sync completed successfully with language: ${lang}`,
        data: {
          language: lang,
          result:
            movieLimit > 0
              ? `~${movieLimit} popular movies targeted`
              : "Popular movies (no limit)",
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
      const { tvLimit } = await this.syncSettingsService.getCatalogLimits();
      await this.dataSyncService.syncPopularTVSeries(lang);

      return {
        success: true,
        message: `TV series sync completed successfully with language: ${lang}`,
        data: {
          language: lang,
          result:
            tvLimit > 0
              ? `~${tvLimit} popular TV series targeted`
              : "Popular TV series (no limit)",
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
      const { trendingLimit } =
        await this.syncSettingsService.getCatalogLimits();
      await this.dataSyncService.syncTrending(lang);

      return {
        success: true,
        message: `Trending sync completed successfully with language: ${lang}`,
        data: {
          language: lang,
          result:
            trendingLimit > 0
              ? `~${trendingLimit} trending items targeted`
              : "Trending items (no limit)",
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
