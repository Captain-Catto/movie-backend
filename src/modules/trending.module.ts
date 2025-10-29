import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Trending } from "../entities/trending.entity";
import { TrendingController } from "../controllers/trending.controller";
import { TrendingService } from "../services/trending.service";
import { TrendingRepository } from "../repositories/trending.repository";
import { TMDBModule } from "./tmdb.module";

@Module({
  imports: [TypeOrmModule.forFeature([Trending]), TMDBModule],
  controllers: [TrendingController],
  providers: [TrendingService, TrendingRepository],
  exports: [TrendingService, TrendingRepository],
})
export class TrendingModule {}
