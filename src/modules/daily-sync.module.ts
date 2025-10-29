import { Module } from "@nestjs/common";
import { DailySyncService } from "../services/daily-sync.service";
import { DailySyncController } from "../controllers/daily-sync.controller";
import { TMDBModule } from "./tmdb.module";
import { MovieModule } from "./movie.module";
import { TVModule } from "./tv.module";

@Module({
  imports: [TMDBModule, MovieModule, TVModule],
  providers: [DailySyncService],
  controllers: [DailySyncController],
  exports: [DailySyncService],
})
export class DailySyncModule {}