import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  Movie,
  TVSeries,
  User,
  ContentControl,
  ViewAnalytics,
  UserActivity,
  SeoMetadata,
  SyncStatus,
  Favorite,
  NotificationTemplate,
  UserNotificationState,
  NotificationAnalytics,
} from "../entities";

// Services
import { AdminContentService } from "../services/admin-content.service";
import { AdminUserService } from "../services/admin-user.service";
import { AdminAnalyticsService } from "../services/admin-analytics.service";
import { AdminSeoService } from "../services/admin-seo.service";
import { AdminDashboardService } from "../services/admin-dashboard.service";

// Controllers
import { AdminContentController } from "../controllers/admin-content.controller";
import { AdminUserController } from "../controllers/admin-user.controller";
import { AdminAnalyticsController } from "../controllers/admin-analytics.controller";
import { AdminSeoController } from "../controllers/admin-seo.controller";
import { AdminDashboardController } from "../controllers/admin-dashboard.controller";
import { AdminSyncController } from "../controllers/admin-sync.controller";
import { DailySyncModule } from "./daily-sync.module";
import { DataSyncModule } from "./data-sync.module";
import { TrendingModule } from "./trending.module";

@Module({
  imports: [
    DailySyncModule,
    DataSyncModule,
    TrendingModule,
    TypeOrmModule.forFeature([
      Movie,
      TVSeries,
      User,
      ContentControl,
      ViewAnalytics,
      UserActivity,
      SeoMetadata,
      SyncStatus,
      Favorite,
      NotificationTemplate,
      UserNotificationState,
      NotificationAnalytics,
    ]),
  ],
  controllers: [
    AdminContentController,
    AdminUserController,
    AdminAnalyticsController,
    AdminSeoController,
    AdminDashboardController,
    AdminSyncController,
  ],
  providers: [
    AdminContentService,
    AdminUserService,
    AdminAnalyticsService,
    AdminSeoService,
    AdminDashboardService,
  ],
  exports: [
    AdminContentService,
    AdminUserService,
    AdminAnalyticsService,
    AdminSeoService,
    AdminDashboardService,
  ],
})
export class AdminModule {}
