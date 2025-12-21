import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AnalyticsController } from "../controllers/analytics.controller";
import { AnalyticsService } from "../services/analytics.service";
import { ViewAnalytics, Movie, TVSeries } from "../entities";
import { AdminModule } from "./admin.module";

@Module({
  imports: [TypeOrmModule.forFeature([ViewAnalytics, Movie, TVSeries]), AdminModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
