import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DataSyncService } from "../services/data-sync.service";
import { CatalogCleanupService } from "../services/catalog-cleanup.service";
import { SyncSettingsService } from "../services/sync-settings.service";

@Injectable()
export class DataSyncTask {
  private readonly logger = new Logger(DataSyncTask.name);

  constructor(
    private dataSyncService: DataSyncService,
    private catalogCleanupService: CatalogCleanupService,
    private syncSettingsService: SyncSettingsService
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleDataSync() {
    this.logger.log("🌤️ Starting scheduled popular content sync...");

    try {
      await this.dataSyncService.syncPopularMovies("en-US");
      await this.dataSyncService.syncPopularTVSeries("en-US");
      await this.dataSyncService.syncTrending("en-US");
      this.logger.log("✅ Popular movies/TV/trending sync completed");

      await this.runCleanup();
    } catch (error) {
      this.logger.error("❌ Scheduled data sync failed:", error);
    }
  }

  // Manual trigger for testing purposes
  async triggerSync() {
    this.logger.log("Manual data sync triggered...");

    try {
      await this.dataSyncService.syncPopularMovies("en-US");
      await this.dataSyncService.syncPopularTVSeries("en-US");
      await this.dataSyncService.syncTrending("en-US");
      this.logger.log("Manual popular data sync completed successfully");

      await this.runCleanup();
    } catch (error) {
      this.logger.error("Manual data sync failed:", error);
      throw error;
    }
  }

  private async runCleanup() {
    try {
      const { movieLimit, tvLimit } =
        await this.syncSettingsService.getCatalogLimits();

      if (Number.isFinite(movieLimit) && movieLimit > 0) {
        await this.catalogCleanupService.trimMovies(movieLimit);
      }
      if (Number.isFinite(tvLimit) && tvLimit > 0) {
        await this.catalogCleanupService.trimTvSeries(tvLimit);
      }
      this.logger.log("🧹 Catalog cleanup completed");
    } catch (cleanupError) {
      this.logger.error("❌ Catalog cleanup failed:", cleanupError);
    }
  }
}
