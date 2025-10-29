import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { NotificationTemplate } from "../entities/notification-template.entity";
import { UserNotificationState } from "../entities/user-notification-state.entity";
import { NotificationAnalytics } from "../entities/notification-analytics.entity";
import { User } from "../entities/user.entity";
import { NotificationService } from "../services/notification.service";
import {
  NotificationTemplateRepository,
  UserNotificationStateRepository,
  NotificationAnalyticsRepository,
} from "../repositories/notification-template.repository";
import { NotificationController } from "../controllers/notification.controller";
import { AdminNotificationController } from "../controllers/admin-notification.controller";
import { NotificationGateway } from "../gateways/notification.gateway";
import { AuthModule } from "./auth.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationTemplate,
      UserNotificationState,
      NotificationAnalytics,
      User,
    ]),
    forwardRef(() => AuthModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: configService.get<string>("JWT_EXPIRES_IN") || "7d",
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [NotificationController, AdminNotificationController],
  providers: [
    NotificationService,
    NotificationTemplateRepository,
    UserNotificationStateRepository,
    NotificationAnalyticsRepository,
    NotificationGateway,
    {
      provide: "NotificationGateway",
      useExisting: NotificationGateway,
    },
  ],
  exports: [
    NotificationService,
    NotificationTemplateRepository,
    UserNotificationStateRepository,
    NotificationAnalyticsRepository,
    NotificationGateway,
  ],
})
export class NotificationModule {}
