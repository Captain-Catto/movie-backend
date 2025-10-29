import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SyncStatus, SyncCategory } from "../entities/sync-status.entity";

@Injectable()
export class SyncStatusRepository {
  private readonly logger = new Logger(SyncStatusRepository.name);

  constructor(
    @InjectRepository(SyncStatus)
    private repository: Repository<SyncStatus>
  ) {}

  /**
   * Check if a specific page has been synced for given category and filters
   */
  async isPageSynced(
    category: SyncCategory,
    page: number,
    genre?: string,
    year?: number,
    language: string = "en-US"
  ): Promise<boolean> {
    const filtersHash = SyncStatus.createFiltersHash(genre, year, language);

    const syncRecord = await this.repository.findOne({
      where: {
        category,
        page,
        filtersHash,
      },
    });

    return syncRecord !== null;
  }

  /**
   * Get sync status for a specific page
   */
  async getSyncStatus(
    category: SyncCategory,
    page: number,
    genre?: string,
    year?: number,
    language: string = "en-US"
  ): Promise<SyncStatus | null> {
    const filtersHash = SyncStatus.createFiltersHash(genre, year, language);

    return this.repository.findOne({
      where: {
        category,
        page,
        filtersHash,
      },
    });
  }

  /**
   * Mark a page as synced with metadata
   */
  async markPageSynced(
    category: SyncCategory,
    page: number,
    itemCount: number,
    totalPages?: number,
    genre?: string,
    year?: number,
    language: string = "en-US",
    metadata?: Record<string, any>
  ): Promise<SyncStatus> {
    const filtersHash = SyncStatus.createFiltersHash(genre, year, language);

    // Check if record already exists
    const existingRecord = await this.getSyncStatus(
      category,
      page,
      genre,
      year,
      language
    );

    if (existingRecord) {
      // Update existing record
      existingRecord.itemCount = itemCount;
      existingRecord.totalPages = totalPages || existingRecord.totalPages;
      existingRecord.metadata = metadata || existingRecord.metadata;
      existingRecord.lastUpdated = new Date();

      return this.repository.save(existingRecord);
    } else {
      // Create new record
      const syncStatus = this.repository.create({
        category,
        page,
        filtersHash,
        totalPages,
        itemCount,
        language,
        metadata,
      });

      return this.repository.save(syncStatus);
    }
  }

  /**
   * Get all synced pages for a category and filter combination
   */
  async getSyncedPages(
    category: SyncCategory,
    genre?: string,
    year?: number,
    language: string = "en-US"
  ): Promise<number[]> {
    const filtersHash = SyncStatus.createFiltersHash(genre, year, language);

    const syncRecords = await this.repository.find({
      where: {
        category,
        filtersHash,
      },
      order: {
        page: "ASC",
      },
    });

    return syncRecords.map((record) => record.page);
  }

  /**
   * Get total pages available for a category and filter combination
   */
  async getTotalPages(
    category: SyncCategory,
    genre?: string,
    year?: number,
    language: string = "en-US"
  ): Promise<number | null> {
    const filtersHash = SyncStatus.createFiltersHash(genre, year, language);

    const syncRecord = await this.repository.findOne({
      where: {
        category,
        filtersHash,
      },
      order: {
        syncedAt: "DESC",
      },
    });

    return syncRecord?.totalPages || null;
  }

  /**
   * Clear old sync records (for cleanup)
   */
  async clearOldSync(
    category: SyncCategory,
    olderThanDays: number = 7
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.repository.delete({
      category,
      syncedAt: { $lt: cutoffDate } as any,
    });

    this.logger.log(
      `Cleared ${result.affected} old sync records for category ${category}`
    );

    return result.affected || 0;
  }

  /**
   * Get sync statistics for monitoring
   */
  async getSyncStats(category: SyncCategory): Promise<{
    totalSyncedPages: number;
    lastSyncTime: Date | null;
    totalItems: number;
    uniqueFilterCombinations: number;
  }> {
    const stats = await this.repository
      .createQueryBuilder("sync")
      .select([
        "COUNT(DISTINCT sync.page) as totalSyncedPages",
        "MAX(sync.syncedAt) as lastSyncTime",
        "SUM(sync.itemCount) as totalItems",
        "COUNT(DISTINCT sync.filtersHash) as uniqueFilterCombinations",
      ])
      .where("sync.category = :category", { category })
      .getRawOne();

    return {
      totalSyncedPages: parseInt(stats.totalSyncedPages) || 0,
      lastSyncTime: stats.lastSyncTime,
      totalItems: parseInt(stats.totalItems) || 0,
      uniqueFilterCombinations: parseInt(stats.uniqueFilterCombinations) || 0,
    };
  }

  /**
   * Check if we need to refresh sync for a page (older than X hours)
   */
  async needsRefresh(
    category: SyncCategory,
    page: number,
    refreshAfterHours: number = 24,
    genre?: string,
    year?: number,
    language: string = "en-US"
  ): Promise<boolean> {
    const syncStatus = await this.getSyncStatus(
      category,
      page,
      genre,
      year,
      language
    );

    if (!syncStatus) {
      return true; // Not synced yet
    }

    const refreshThreshold = new Date();
    refreshThreshold.setHours(refreshThreshold.getHours() - refreshAfterHours);

    return syncStatus.lastUpdated < refreshThreshold;
  }

  /**
   * Clear stale sync status (when sync marked but no actual data)
   */
  async clearSyncStatus(
    category: SyncCategory,
    page: number,
    genre?: string,
    year?: number,
    language: string = "en-US"
  ): Promise<void> {
    const filtersHash = SyncStatus.createFiltersHash(genre, year, language);

    const result = await this.repository.delete({
      category,
      page,
      filtersHash,
    });

    if (result.affected && result.affected > 0) {
      this.logger.log(
        `🗑️  Cleared stale sync status for ${category} page ${page}${
          genre ? ` (genre: ${genre})` : ""
        }${year ? ` (year: ${year})` : ""}`
      );
    }
  }
}
