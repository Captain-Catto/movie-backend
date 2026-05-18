import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import type { StringValue } from "ms";
import { WatchParty } from "../entities/watch-party.entity";
import { User } from "../entities/user.entity";
import { WatchPartyService } from "../services/watch-party.service";
import { WatchPartyRepository } from "../repositories/watch-party.repository";
import { WatchPartyGateway } from "../gateways/watch-party.gateway";
import { WatchPartyController } from "../controllers/watch-party.controller";
import { AuthModule } from "./auth.module";

const DEFAULT_JWT_EXPIRES_IN: StringValue = "7d";

const resolveJwtExpiresIn = (raw: string | undefined): number | StringValue => {
  if (!raw) return DEFAULT_JWT_EXPIRES_IN;
  const asNumber = Number(raw);
  return Number.isFinite(asNumber) ? asNumber : (raw as StringValue);
};

@Module({
  imports: [
    TypeOrmModule.forFeature([WatchParty, User]),
    forwardRef(() => AuthModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: resolveJwtExpiresIn(configService.get<string>("JWT_EXPIRES_IN")),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [WatchPartyController],
  providers: [WatchPartyService, WatchPartyRepository, WatchPartyGateway],
  exports: [WatchPartyService],
})
export class WatchPartyModule {}
