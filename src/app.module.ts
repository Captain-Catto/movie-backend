import { Module, ValidationPipe } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { APP_PIPE } from "@nestjs/core";
import { MovieModule } from "./modules/movie.module";
import { TVModule } from "./modules/tv.module";
import { TrendingModule } from "./modules/trending.module";
import { SearchModule } from "./modules/search.module";
import { AuthModule } from "./modules/auth.module";
import { DataSyncModule } from "./modules/data-sync.module";
import { DailySyncModule } from "./modules/daily-sync.module";
import { PeopleModule } from "./modules/people.module";
import { ContentModule } from "./modules/content.module";
import { UploadModule } from "./modules/upload.module";
import { RecommendationModule } from "./modules/recommendation.module";
import { NotificationModule } from "./modules/notification.module";
import { FavoriteModule } from "./modules/favorite.module";
import { CommentModule } from "./modules/comment.module";
import { AdminModule } from "./modules/admin.module";
import { SyncController } from "./controllers/sync.controller";
import { DebugController } from "./controllers/debug.controller";
import { UserRepository } from "./repositories/user.repository";
import {
  Movie,
  TVSeries,
  Trending,
  User,
  SyncStatus,
  RecentSearch,
  NotificationTemplate,
  UserNotificationState,
  NotificationAnalytics,
  Favorite,
  ContentControl,
  ViewAnalytics,
  UserActivity,
  SeoMetadata,
  Comment,
  CommentLike,
  CommentMention,
  BannedWord,
  CommentReport,
} from "./entities";
import { Recommendation } from "./entities/recommendation.entity";
import { PersonCache } from "./entities/person-cache.entity";
import { PersonCreditsCache } from "./entities/person-credits-cache.entity";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get("DATABASE_HOST"),
        port: configService.get("DATABASE_PORT"),
        username: configService.get("DATABASE_USERNAME"),
        password: configService.get("DATABASE_PASSWORD"),
        database: configService.get("DATABASE_NAME"),
        entities: [
          Movie,
          TVSeries,
          Trending,
          User,
          SyncStatus,
          Recommendation,
          PersonCache,
          PersonCreditsCache,
          RecentSearch,
          NotificationTemplate,
          UserNotificationState,
          NotificationAnalytics,
          Favorite,
          ContentControl,
          ViewAnalytics,
          UserActivity,
          SeoMetadata,
          Comment,
          CommentLike,
          CommentMention,
          BannedWord,
          CommentReport,
        ],
        synchronize:
          configService.get("TYPEORM_SYNCHRONIZE") === "true" ||
          configService.get("NODE_ENV") === "development",
        logging:
          (configService.get<string>("TYPEORM_LOGGING") || "")
            .toLowerCase() === "true",
        ssl:
          configService.get("NODE_ENV") === "production"
            ? { rejectUnauthorized: false }
            : false,
      }),
      inject: [ConfigService],
    }),
    MovieModule,
    TVModule,
    TrendingModule,
    SearchModule,
    AuthModule,
    DataSyncModule,
    DailySyncModule,
    PeopleModule,
    ContentModule,
    UploadModule,
    RecommendationModule,
    NotificationModule,
    FavoriteModule,
    CommentModule,
    AdminModule,
    TypeOrmModule.forFeature([User]), // For DebugController
  ],
  controllers: [SyncController, DebugController],
  providers: [
    UserRepository, // For DebugController
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: false,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    },
  ],
})
export class AppModule {}
