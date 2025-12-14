import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";
import { Roles } from "../decorators/roles.decorator";
import { UserRole } from "../entities/user.entity";
import { DailySyncService } from "../services/daily-sync.service";
import { DataSyncService } from "../services/data-sync.service";
import { CatalogCleanupService } from "../services/catalog-cleanup.service";
import { AdminSyncRequestDto } from "../dto/admin-sync.dto";
import { ApiResponse } from "../interfaces/api.interface";

@Controller("admin/sync")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminSyncController {
  private readonly logger = new Logger(AdminSyncController.name);
  private readonly movieLimit = Number(
    process.env.MOVIE_CATALOG_LIMIT || 500_000
  );
  private readonly tvLimit = Number(
    process.env.TV_CATALOG_LIMIT || 200_000
  );

  constructor(
    private readonly dailySyncService: DailySyncService,
    private readonly dataSyncService: DataSyncService,
    private readonly catalogCleanupService: CatalogCleanupService
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerSync(@Body() body: AdminSyncRequestDto): Promise<ApiResponse> {
    const {
      target = "all",
      date,
      startFromBatch = 0,
      batchSize = 100,
    } = body;

    this.logger.log(
      `🛠️ Admin requested manual sync: target=${target}, date=${
        date || "latest"
      }`
    );

    try {
      // Fire-and-forget: Run sync in background without waiting
      this.runSyncInBackground(target, date, batchSize, startFromBatch).catch(
        (error) => {
          this.logger.error(
            `❌ Background sync failed for target ${target}:`,
            error.stack || error.message
          );
        }
      );

      // Return immediately to avoid timeout
      return {
        success: true,
        message: `Sync task for "${target}" has been queued and is running in background`,
        data: {
          target,
          date: date || null,
          batchSize,
          startFromBatch,
          status: "running",
          note: "Check server logs for progress. This may take several minutes.",
        },
      };
    } catch (error) {
      this.logger.error(
        `❌ Failed to queue sync task for target ${target}:`,
        error.stack || error.message
      );
      return {
        success: false,
        message: "Failed to queue sync task",
        error: error.message,
      };
    }
  }

  private async runSyncInBackground(
    target: string,
    date: string | undefined,
    batchSize: number,
    startFromBatch: number
  ): Promise<void> {
    const startTime = Date.now();
    this.logger.log(`🚀 Starting background sync for target: ${target}`);

    try {
      switch (target) {
        case "movies": {
          const syncDate = date ? new Date(date) : new Date();
          await this.dailySyncService.syncMoviesFromDailyExport(
            syncDate,
            batchSize,
            startFromBatch
          );
          break;
        }
        case "tv": {
          const syncDate = date ? new Date(date) : new Date();
          await this.dailySyncService.syncTVFromDailyExport(
            syncDate,
            batchSize,
            startFromBatch
          );
          break;
        }
        case "today": {
          await this.dailySyncService.syncTodayExports();
          break;
        }
        case "popular": {
          await this.dataSyncService.syncPopularMovies("en-US");
          await this.dataSyncService.syncPopularTVSeries("en-US");
          await this.dataSyncService.syncTrending("en-US");
          await this.runCleanup();
          break;
        }
        case "all":
        default: {
          const syncDate = date ? new Date(date) : new Date();
          await this.dailySyncService.syncAllFromDailyExport(syncDate);
          break;
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      this.logger.log(
        `✅ Background sync completed for "${target}" in ${duration}s`
      );
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      this.logger.error(
        `❌ Background sync failed for "${target}" after ${duration}s:`,
        error.stack || error.message
      );
      throw error;
    }
  }

  private async runCleanup(): Promise<void> {
    try {
      if (Number.isFinite(this.movieLimit) && this.movieLimit > 0) {
        await this.catalogCleanupService.trimMovies(this.movieLimit);
      }
      if (Number.isFinite(this.tvLimit) && this.tvLimit > 0) {
        await this.catalogCleanupService.trimTvSeries(this.tvLimit);
      }
      this.logger.log("🧹 Catalog cleanup completed after popular sync");
    } catch (cleanupError) {
      this.logger.error(
        "❌ Catalog cleanup failed after popular sync",
        cleanupError instanceof Error ? cleanupError.stack : cleanupError
      );
    }
  }
}
