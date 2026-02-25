import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Favorite } from "../entities/favorite.entity";
import { FavoriteRepository } from "../repositories/favorite.repository";
import { FavoriteService } from "../services/favorite.service";
import { FavoriteController } from "../controllers/favorite.controller";
import { UserActivityLoggerService } from "../services/user-activity-logger.service";
import { UserLog } from "../entities/user-log.entity";
import { AdminModule } from "./admin.module";

@Module({
  imports: [TypeOrmModule.forFeature([Favorite, UserLog]), AdminModule],
  providers: [FavoriteRepository, FavoriteService, UserActivityLoggerService],
  controllers: [FavoriteController],
  exports: [FavoriteService, FavoriteRepository],
})
export class FavoriteModule {}
