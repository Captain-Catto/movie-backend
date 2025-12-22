import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import type { StringValue } from "ms";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../entities/user.entity";
import { RefreshToken } from "../entities/refresh-token.entity";
import { AuthController } from "../controllers/auth.controller";
import { AuthService } from "../services/auth.service";
import { UserRepository } from "../repositories/user.repository";
import { RefreshTokenRepository } from "../repositories/refresh-token.repository";
import { JwtStrategy } from "../auth/jwt.strategy";
import { SettingsModule } from "./settings.module";

const DEFAULT_JWT_EXPIRES_IN: StringValue = "15m";

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
    TypeOrmModule.forFeature([User, RefreshToken]),
    PassportModule.register({ defaultStrategy: "jwt" }),
    SettingsModule,
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
  controllers: [AuthController],
  providers: [AuthService, UserRepository, RefreshTokenRepository, JwtStrategy],
  exports: [AuthService, UserRepository, RefreshTokenRepository, JwtStrategy],
})
export class AuthModule {}
