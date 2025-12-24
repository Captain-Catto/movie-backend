import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import type { SignOptions } from "jsonwebtoken";
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
  Setting,
} from "../entities";

// Services
import { AdminContentService } from "../services/admin-content.service";
import { AdminUserService } from "../services/admin-user.service";
import { AdminAnalyticsService } from "../services/admin-analytics.service";
import { AdminSeoService } from "../services/admin-seo.service";
import { AdminDashboardService } from "../services/admin-dashboard.service";
import { AdminAnalyticsRealtimeService } from "../services/admin-analytics-realtime.service";
import { AdminAnalyticsGateway } from "../gateways/admin-analytics.gateway";

// Controllers
import { AdminContentController } from "../controllers/admin-content.controller";
import { AdminUserController } from "../controllers/admin-user.controller";
import { AdminAnalyticsController } from "../controllers/admin-analytics.controller";
import { AdminSeoController } from "../controllers/admin-seo.controller";
import { AdminDashboardController } from "../controllers/admin-dashboard.controller";
import { AdminSyncController } from "../controllers/admin-sync.controller";
import { AdminSettingsController } from "../controllers/admin-settings.controller";
import { DailySyncModule } from "./daily-sync.module";
import { DataSyncModule } from "./data-sync.module";
import { TrendingModule } from "./trending.module";
import { AdminSettingsService } from "../services/admin-settings.service";
import { SettingsModule } from "./settings.module";
import { ViewerAuditModule } from "./viewer-audit.module";

@Module({
  imports: [
    ViewerAuditModule,
    DailySyncModule,
    DataSyncModule,
    TrendingModule,
    SettingsModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const expiresIn = (configService.get<string>("JWT_EXPIRES_IN") ||
          "15m") as SignOptions["expiresIn"];

        return {
          secret: configService.getOrThrow<string>("JWT_SECRET"),
          signOptions: {
            expiresIn,
          },
        };
      },
      inject: [ConfigService],
    }),
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
      Setting,
    ]),
  ],
  controllers: [
    AdminContentController,
    AdminUserController,
    AdminAnalyticsController,
    AdminSeoController,
    AdminDashboardController,
    AdminSyncController,
    AdminSettingsController,
  ],
  providers: [
    AdminContentService,
    AdminUserService,
    AdminAnalyticsService,
    AdminSeoService,
    AdminDashboardService,
    AdminAnalyticsRealtimeService,
    AdminAnalyticsGateway,
    AdminSettingsService,
  ],
  exports: [
    AdminContentService,
    AdminUserService,
    AdminAnalyticsService,
    AdminSeoService,
    AdminDashboardService,
    AdminAnalyticsRealtimeService,
    AdminAnalyticsGateway,
    AdminSettingsService,
  ],
})
export class AdminModule {}
