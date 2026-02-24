import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Trending } from "../entities/trending.entity";
import { ContentTranslation } from "../entities/content-translation.entity";
import { TrendingController } from "../controllers/trending.controller";
import { TrendingService } from "../services/trending.service";
import { TrendingRepository } from "../repositories/trending.repository";
import { ContentTranslationRepository } from "../repositories/content-translation.repository";
import { TMDBModule } from "./tmdb.module";

@Module({
  imports: [TypeOrmModule.forFeature([Trending, ContentTranslation]), TMDBModule],
  controllers: [TrendingController],
  providers: [TrendingService, TrendingRepository, ContentTranslationRepository],
  exports: [TrendingService, TrendingRepository],
})
export class TrendingModule {}
