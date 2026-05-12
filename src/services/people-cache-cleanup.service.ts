import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PeopleCacheRepository } from "../repositories/people-cache.repository";
import { SyncSettingsService } from "./sync-settings.service";

@Injectable()
export class PeopleCacheCleanupService {
  private readonly logger = new Logger(PeopleCacheCleanupService.name);

  constructor(
    private readonly peopleCacheRepository: PeopleCacheRepository,
    private readonly syncSettingsService: SyncSettingsService
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async dailyCleanup(): Promise<void> {
    try {
      this.logger.log("🧹 Starting daily people cache cleanup...");

      const statsBefore = await this.peopleCacheRepository.getCacheStats();
      const { peopleCacheLimit } =
        await this.syncSettingsService.getCatalogLimits();
      this.logger.log("📊 Current people cache stats:", {
        personCache: statsBefore.personCache,
        creditsCache: statsBefore.creditsCache,
        peopleCacheLimit,
        overallHealthStatus: statsBefore.overallHealthStatus,
      });

      const lightCleanup =
        await this.peopleCacheRepository.cleanupOldUnusedCache(7);

      if (
        lightCleanup.personCacheRemoved > 0 ||
        lightCleanup.creditsCacheRemoved > 0
      ) {
        this.logger.log("🧹 People light cleanup completed:", lightCleanup);
      }

      const statsAfterLight = await this.peopleCacheRepository.getCacheStats();
      const exceedsConfiguredLimit =
        peopleCacheLimit > 0 &&
        (statsAfterLight.personCache.totalRecords > peopleCacheLimit ||
          statsAfterLight.creditsCache.totalRecords > peopleCacheLimit);

      if (exceedsConfiguredLimit) {
        this.logger.log(
          `💪 People cache exceeds configured limit (${peopleCacheLimit}), running major cleanup...`
        );
        const majorCleanup =
          await this.peopleCacheRepository.performMajorCleanup(peopleCacheLimit);
        this.logger.log("✅ People major cleanup completed:", majorCleanup);
      } else {
        this.logger.log("✅ People cache is within configured limit, no major cleanup needed");
      }
    } catch (error) {
      this.logger.error(
        "❌ Daily people cache cleanup failed:",
        error instanceof Error ? error.message : error
      );
    }
  }
}
