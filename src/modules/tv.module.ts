import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TVSeries } from "../entities/tv-series.entity";
import { Recommendation } from "../entities/recommendation.entity";
import { TVController } from "../controllers/tv.controller";
import { TVSeriesService } from "../services/tv-series.service";
import { TVSeriesRepository } from "../repositories/tv-series.repository";
import { RecommendationRepository } from "../repositories/recommendation.repository";
import { TMDBModule } from "./tmdb.module";

@Module({
  imports: [TypeOrmModule.forFeature([TVSeries, Recommendation]), TMDBModule],
  controllers: [TVController],
  providers: [TVSeriesService, TVSeriesRepository, RecommendationRepository],
  exports: [TVSeriesService, TVSeriesRepository, RecommendationRepository],
})
export class TVModule {}
