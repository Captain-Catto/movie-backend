import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DailySyncService } from "../services/daily-sync.service";
import { DailySyncController } from "../controllers/daily-sync.controller";
import { ContentTranslation } from "../entities/content-translation.entity";
import { ContentTranslationRepository } from "../repositories/content-translation.repository";
import { TMDBModule } from "./tmdb.module";
import { MovieModule } from "./movie.module";
import { TVModule } from "./tv.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([ContentTranslation]),
    TMDBModule,
    MovieModule,
    TVModule,
  ],
  providers: [DailySyncService, ContentTranslationRepository],
  controllers: [DailySyncController],
  exports: [DailySyncService],
})
export class DailySyncModule {}
