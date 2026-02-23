import { Module } from "@nestjs/common";
import { ContentController } from "../controllers/content.controller";
import { MovieModule } from "./movie.module";
import { TVModule } from "./tv.module";
import { StreamEmbedService } from "../services/stream-embed.service";

@Module({
  imports: [MovieModule, TVModule],
  controllers: [ContentController],
  providers: [StreamEmbedService],
})
export class ContentModule {}
