import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SearchController } from "../controllers/search.controller";
import { SearchService } from "../services/search.service";
import { RecentSearchService } from "../services/recent-search.service";
import { RecentSearchRepository } from "../repositories/recent-search.repository";
import { RecentSearch } from "../entities/recent-search.entity";
import { MovieModule } from "./movie.module";
import { TVModule } from "./tv.module";
import { TMDBModule } from "./tmdb.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([RecentSearch]),
    MovieModule,
    TVModule,
    TMDBModule,
  ],
  controllers: [SearchController],
  providers: [SearchService, RecentSearchService, RecentSearchRepository],
  exports: [SearchService, RecentSearchService],
})
export class SearchModule {}
