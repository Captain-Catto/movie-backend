import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DataSyncService } from "../services/data-sync.service";
import { CatalogCleanupService } from "../services/catalog-cleanup.service";

@Injectable()
export class DataSyncTask {
  private readonly logger = new Logger(DataSyncTask.name);
  private readonly movieLimit = Number(
    process.env.MOVIE_CATALOG_LIMIT || 500_000
  );
  private readonly tvLimit = Number(
    process.env.TV_CATALOG_LIMIT || 200_000
  );

  constructor(
    private dataSyncService: DataSyncService,
    private catalogCleanupService: CatalogCleanupService
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
      if (Number.isFinite(this.movieLimit) && this.movieLimit > 0) {
        await this.catalogCleanupService.trimMovies(this.movieLimit);
      }
      if (Number.isFinite(this.tvLimit) && this.tvLimit > 0) {
        await this.catalogCleanupService.trimTvSeries(this.tvLimit);
      }
      this.logger.log("🧹 Catalog cleanup completed");
    } catch (cleanupError) {
      this.logger.error("❌ Catalog cleanup failed:", cleanupError);
    }
  }
}
