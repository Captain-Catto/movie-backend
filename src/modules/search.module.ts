import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SearchController } from "../controllers/search.controller";
import { SearchService } from "../services/search.service";
import { RecentSearchService } from "../services/recent-search.service";
import { RecentSearchRepository } from "../repositories/recent-search.repository";
import { ContentTranslationRepository } from "../repositories/content-translation.repository";
import { RecentSearch } from "../entities/recent-search.entity";
import { ContentTranslation } from "../entities/content-translation.entity";
import { MovieModule } from "./movie.module";
import { TVModule } from "./tv.module";
import { TMDBModule } from "./tmdb.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([RecentSearch, ContentTranslation]),
    MovieModule,
    TVModule,
    TMDBModule,
  ],
  controllers: [SearchController],
  providers: [
    SearchService,
    RecentSearchService,
    RecentSearchRepository,
    ContentTranslationRepository,
  ],
  exports: [SearchService, RecentSearchService],
})
export class SearchModule {}
