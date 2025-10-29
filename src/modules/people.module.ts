import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PeopleController } from "../controllers/people.controller";
import { TMDBModule } from "./tmdb.module";
import { PeopleCacheService } from "../services/people-cache.service";
import { PeopleCacheRepository } from "../repositories/people-cache.repository";
import { PersonCache } from "../entities/person-cache.entity";
import { PersonCreditsCache } from "../entities/person-credits-cache.entity";

@Module({
  imports: [
    TMDBModule,
    TypeOrmModule.forFeature([PersonCache, PersonCreditsCache]),
  ],
  controllers: [PeopleController],
  providers: [PeopleCacheService, PeopleCacheRepository],
  exports: [PeopleCacheService, PeopleCacheRepository],
})
export class PeopleModule {}
