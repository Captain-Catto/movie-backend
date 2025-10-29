import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from "typeorm";

export enum SyncCategory {
  MOVIES = "movies",
  TV_SERIES = "tv_series",
  TRENDING = "trending",
}

@Entity("sync_status")
@Unique("UQ_sync_category_page_filters", ["category", "page", "filtersHash"])
@Index("IDX_sync_category_page", ["category", "page"])
@Index("IDX_sync_filters_hash", ["filtersHash"])
export class SyncStatus {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: "enum",
    enum: SyncCategory,
    comment: "Type of content being synced: movies, tv_series, trending",
  })
  category: SyncCategory;

  @Column({
    type: "integer",
    comment: "Page number from TMDB API (1-based)",
  })
  page: number;

  @Column({
    type: "varchar",
    length: 64,
    nullable: true,
    comment: "MD5 hash of filter combination (genre, year, etc)",
  })
  filtersHash: string | null;

  @Column({
    type: "integer",
    nullable: true,
    comment: "Total pages available from TMDB for this category/filter",
  })
  totalPages: number | null;

  @Column({
    type: "integer",
    default: 0,
    comment: "Number of items synced in this page",
  })
  itemCount: number;

  @Column({
    type: "varchar",
    length: 10,
    default: "en-US",
    comment: "Language used for syncing",
  })
  language: string;

  @Column({
    type: "jsonb",
    nullable: true,
    comment: "Additional metadata about the sync operation",
  })
  metadata: Record<string, any> | null;

  @CreateDateColumn({
    comment: "When this page was first synced",
  })
  syncedAt: Date;

  @UpdateDateColumn({
    comment: "When this page was last updated",
  })
  lastUpdated: Date;

  // Helper methods
  static generateFiltersHash(filters: {
    genre?: string;
    year?: number;
    language?: string;
  }): string | null {
    if (!filters.genre && !filters.year) {
      return null; // No filters = null hash
    }

    const crypto = require("crypto");
    const filterString = JSON.stringify({
      genre: filters.genre || null,
      year: filters.year || null,
      language: filters.language || "en-US",
    });

    return crypto.createHash("md5").update(filterString).digest("hex");
  }

  static createFiltersHash(
    genre?: string,
    year?: number,
    language: string = "en-US"
  ): string | null {
    return SyncStatus.generateFiltersHash({ genre, year, language });
  }
}
