import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Favorite } from "../entities/favorite.entity";
import { FavoriteRepository } from "../repositories/favorite.repository";
import { FavoriteService } from "../services/favorite.service";
import { FavoriteController } from "../controllers/favorite.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Favorite])],
  providers: [FavoriteRepository, FavoriteService],
  controllers: [FavoriteController],
  exports: [FavoriteService, FavoriteRepository],
})
export class FavoriteModule {}
