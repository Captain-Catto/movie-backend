import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import type { StringValue } from "ms";
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

const DEFAULT_JWT_EXPIRES_IN: StringValue = "7d";

const resolveJwtExpiresIn = (
  raw: string | undefined
): number | StringValue => {
  if (!raw) {
    return DEFAULT_JWT_EXPIRES_IN;
  }

  const asNumber = Number(raw);
  return Number.isFinite(asNumber) ? asNumber : (raw as StringValue);
};

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
        secret: configService.getOrThrow<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: resolveJwtExpiresIn(
            configService.get<string>("JWT_EXPIRES_IN")
          ),
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
