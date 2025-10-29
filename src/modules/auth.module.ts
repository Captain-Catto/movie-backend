import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../entities/user.entity";
import { AuthController } from "../controllers/auth.controller";
import { AuthService } from "../services/auth.service";
import { UserRepository } from "../repositories/user.repository";
import { JwtStrategy } from "../auth/jwt.strategy";

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule.register({ defaultStrategy: "jwt" }),
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
  controllers: [AuthController],
  providers: [AuthService, UserRepository, JwtStrategy],
  exports: [AuthService, UserRepository, JwtStrategy],
})
export class AuthModule {}
