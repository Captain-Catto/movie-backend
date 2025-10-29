import { Injectable, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";

@Injectable()
export class CatalogCleanupService {
  private readonly logger = new Logger(CatalogCleanupService.name);

  constructor(private readonly dataSource: DataSource) {}

  async trimMovies(limit: number): Promise<void> {
    if (limit <= 0) {
      return;
    }

    await this.dataSource.query(
      `
      WITH ranked AS (
        SELECT id
        FROM movies
        ORDER BY "lastUpdated" DESC, id DESC
        OFFSET $1
      )
      DELETE FROM movies
      WHERE id IN (SELECT id FROM ranked);
      `,
      [limit]
    );

    this.logger.log(`Catalog trimmed. Maximum movies kept: ${limit}`);
  }

  async trimTvSeries(limit: number): Promise<void> {
    if (limit <= 0) {
      return;
    }

    await this.dataSource.query(
      `
      WITH ranked AS (
        SELECT id
        FROM tv_series
        ORDER BY "lastUpdated" DESC, id DESC
        OFFSET $1
      )
      DELETE FROM tv_series
      WHERE id IN (SELECT id FROM ranked);
      `,
      [limit]
    );

    this.logger.log(`Catalog trimmed. Maximum TV series kept: ${limit}`);
  }
}
