import { Module } from "@nestjs/common";
import { MovieDetailController } from "../controllers/movie-detail.controller";
import { MovieModule } from "./movie.module";

@Module({
  imports: [MovieModule],
  controllers: [MovieDetailController],
})
export class MovieDetailModule {}
