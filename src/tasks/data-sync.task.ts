import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SchedulerRegistry } from "@nestjs/schedule";
import { CronJob } from "cron";
import { DataSyncService } from "../services/data-sync.service";
import { CatalogCleanupService } from "../services/catalog-cleanup.service";
import { SyncSettingsService } from "../services/sync-settings.service";

@Injectable()
export class DataSyncTask implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DataSyncTask.name);
  private readonly jobName = "catalog-sync-job";

  constructor(
    private dataSyncService: DataSyncService,
    private catalogCleanupService: CatalogCleanupService,
    private syncSettingsService: SyncSettingsService,
    private schedulerRegistry: SchedulerRegistry,
    private configService: ConfigService
  ) {}

  onModuleInit() {
    const enabled =
      (this.configService.get<string>("SYNC_CRON_ENABLED", "true") || "")
        .toLowerCase() === "true";

    if (!enabled) {
      this.logger.log("SYNC cron job is disabled via SYNC_CRON_ENABLED=false");
      return;
    }

    const expression = this.configService.get<string>(
      "SYNC_CRON_EXPRESSION",
      "0 3 * * *"
    );
    const timezone = this.configService.get<string>(
      "SYNC_CRON_TIMEZONE",
      "UTC"
    );

    try {
      const job = new CronJob(expression, () => {
        this.handleDataSync().catch((error) =>
          this.logger.error("Unhandled scheduled sync error:", error)
        );
      }, null, false, timezone);

      this.schedulerRegistry.addCronJob(this.jobName, job);
      job.start();

      this.logger.log(
        `SYNC cron job started: expression="${expression}", timezone="${timezone}"`
      );
    } catch (error) {
      this.logger.error(
        `Invalid cron configuration. expression="${expression}", timezone="${timezone}"`,
        error
      );
    }
  }

  onModuleDestroy() {
    try {
      const job = this.schedulerRegistry.getCronJob(this.jobName);
      job.stop();
      this.schedulerRegistry.deleteCronJob(this.jobName);
    } catch {
      // no-op if job does not exist
    }
  }

  async handleDataSync() {
    const baseLanguage = this.configService.get<string>(
      "SYNC_BASE_LANGUAGE",
      "en-US"
    );
    this.logger.log(
      `🌤️ Starting scheduled popular content sync (base language: ${baseLanguage})...`
    );

    try {
      await this.dataSyncService.syncPopularMovies(baseLanguage);
      await this.dataSyncService.syncPopularTVSeries(baseLanguage);
      await this.dataSyncService.syncTrending(baseLanguage);
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
      const baseLanguage = this.configService.get<string>(
        "SYNC_BASE_LANGUAGE",
        "en-US"
      );
      await this.dataSyncService.syncPopularMovies(baseLanguage);
      await this.dataSyncService.syncPopularTVSeries(baseLanguage);
      await this.dataSyncService.syncTrending(baseLanguage);
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
