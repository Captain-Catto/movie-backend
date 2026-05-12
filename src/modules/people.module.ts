import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PeopleController } from "../controllers/people.controller";
import { TMDBModule } from "./tmdb.module";
import { PeopleCacheService } from "../services/people-cache.service";
import { PeopleCacheCleanupService } from "../services/people-cache-cleanup.service";
import { PeopleCacheRepository } from "../repositories/people-cache.repository";
import { PersonCache } from "../entities/person-cache.entity";
import { PersonCreditsCache } from "../entities/person-credits-cache.entity";
import { DataSyncModule } from "./data-sync.module";

@Module({
  imports: [
    TMDBModule,
    DataSyncModule,
    TypeOrmModule.forFeature([PersonCache, PersonCreditsCache]),
  ],
  controllers: [PeopleController],
  providers: [PeopleCacheService, PeopleCacheCleanupService, PeopleCacheRepository],
  exports: [PeopleCacheService, PeopleCacheRepository],
})
export class PeopleModule {}
