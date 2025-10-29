import { Module } from "@nestjs/common";
import { ContentController } from "../controllers/content.controller";
import { MovieModule } from "./movie.module";
import { TVModule } from "./tv.module";

@Module({
  imports: [MovieModule, TVModule],
  controllers: [ContentController],
})
export class ContentModule {}