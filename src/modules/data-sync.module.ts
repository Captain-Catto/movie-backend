import { Module, forwardRef } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { DataSyncService } from "../services/data-sync.service";
import { DataSyncTask } from "../tasks/data-sync.task";
import { CatalogCleanupService } from "../services/catalog-cleanup.service";
import { TMDBModule } from "./tmdb.module";
import { MovieModule } from "./movie.module";
import { TVModule } from "./tv.module";
import { TrendingModule } from "./trending.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SyncSettings } from "../entities/sync-settings.entity";
import { SyncSettingsService } from "../services/sync-settings.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([SyncSettings]),
    ScheduleModule.forRoot(),
    TMDBModule,
    forwardRef(() => MovieModule),
    forwardRef(() => TVModule),
    forwardRef(() => TrendingModule),
  ],
  providers: [
    DataSyncService,
    DataSyncTask,
    CatalogCleanupService,
    SyncSettingsService,
  ],
  exports: [
    DataSyncService,
    DataSyncTask,
    CatalogCleanupService,
    SyncSettingsService,
  ],
})
export class DataSyncModule {}
