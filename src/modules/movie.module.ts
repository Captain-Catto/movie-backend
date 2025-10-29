import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Movie } from "../entities/movie.entity";
import { SyncStatus } from "../entities/sync-status.entity";
import { Recommendation } from "../entities/recommendation.entity";
import { MovieController } from "../controllers/movie.controller";
import { MovieService } from "../services/movie.service";
import { MovieRepository } from "../repositories/movie.repository";
import { SyncStatusRepository } from "../repositories/sync-status.repository";
import { RecommendationRepository } from "../repositories/recommendation.repository";
import { RecommendationCleanupService } from "../services/recommendation-cleanup.service";
import { DataSyncModule } from "./data-sync.module";
import { TMDBModule } from "./tmdb.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Movie, SyncStatus, Recommendation]),
    forwardRef(() => DataSyncModule),
    TMDBModule,
  ],
  controllers: [MovieController],
  providers: [
    MovieService, 
    MovieRepository, 
    SyncStatusRepository,
    RecommendationRepository,
    RecommendationCleanupService,
  ],
  exports: [
    MovieService, 
    MovieRepository, 
    SyncStatusRepository,
    RecommendationRepository,
    RecommendationCleanupService,
  ],
})
export class MovieModule {}
