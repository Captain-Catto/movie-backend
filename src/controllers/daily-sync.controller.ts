import { Controller, Post, Get, Query, Logger } from "@nestjs/common";
import { DailySyncService } from "../services/daily-sync.service";

@Controller("daily-sync")
export class DailySyncController {
  private readonly logger = new Logger(DailySyncController.name);

  constructor(private readonly dailySyncService: DailySyncService) {}

  /**
   * Sync movies from daily export for specific date
   * POST /api/daily-sync/movies?date=2025-09-04&startFromBatch=10
   */
  @Post("movies")
  async syncMovies(
    @Query("date") dateStr?: string,
    @Query("startFromBatch") startFromBatch?: string
  ) {
    try {
      const date = dateStr ? new Date(dateStr) : new Date();
      const batchStart = startFromBatch ? parseInt(startFromBatch) : 0;

      // Simplified controller log
      this.logger.log(`🎬 Movie sync request: ${date.toDateString()}`);

      await this.dailySyncService.syncMoviesFromDailyExport(
        date,
        100,
        batchStart
      );

      return {
        success: true,
        message: `Movie sync completed for ${date.toDateString()}`,
        date: date.toISOString(),
      };
    } catch (error) {
      this.logger.error("❌ Movie sync failed:", error);
      throw error;
    }
  }

  /**
   * Sync TV series from daily export for specific date
   * POST /api/daily-sync/tv?date=2025-09-04&startFromBatch=10
   */
  @Post("tv")
  async syncTV(
    @Query("date") dateStr?: string,
    @Query("startFromBatch") startFromBatch?: string
  ) {
    try {
      const date = dateStr ? new Date(dateStr) : new Date();
      const batchStart = startFromBatch ? parseInt(startFromBatch) : 0;

      // Simplified controller log
      this.logger.log(`📺 TV series sync request: ${date.toDateString()}`);

      await this.dailySyncService.syncTVFromDailyExport(date, 100, batchStart);

      return {
        success: true,
        message: `TV series sync completed for ${date.toDateString()}`,
        date: date.toISOString(),
      };
    } catch (error) {
      this.logger.error("❌ TV series sync failed:", error);
      throw error;
    }
  }

  /**
   * Sync all content types from daily export
   * POST /api/daily-sync/all?date=2025-09-04
   */
  @Post("all")
  async syncAll(@Query("date") dateStr?: string) {
    try {
      const date = dateStr ? new Date(dateStr) : new Date();

      this.logger.log(`🚀 Full sync request: ${date.toDateString()}`);

      await this.dailySyncService.syncAllFromDailyExport(date);

      return {
        success: true,
        message: `Full daily sync completed for ${date.toDateString()}`,
        date: date.toISOString(),
      };
    } catch (error) {
      this.logger.error("❌ Full sync failed:", error);
      throw error;
    }
  }

  /**
   * Sync from most recent available exports
   * POST /api/daily-sync/today
   */
  @Post("today")
  async syncToday() {
    try {
      this.logger.log("🔍 Today sync request");

      await this.dailySyncService.syncTodayExports();

      return {
        success: true,
        message:
          "Sync from most recent available exports completed successfully",
        date: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error("❌ Today sync failed:", error);
      throw error;
    }
  }

  /**
   * Get sync statistics
   * GET /api/daily-sync/stats
   */
  @Get("stats")
  async getSyncStats() {
    try {
      const stats = await this.dailySyncService.getSyncStats();

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      this.logger.error("Error getting sync stats:", error);
      throw error;
    }
  }
}
