import { Module } from "@nestjs/common";
import { TMDBService } from "../services/tmdb.service";

@Module({
  providers: [TMDBService],
  exports: [TMDBService],
})
export class TMDBModule {}
