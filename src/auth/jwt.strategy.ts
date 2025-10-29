import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "../services/auth.service";
import { User } from "../entities/user.entity";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET"),
    });
  }

  async validate(payload: any): Promise<User> {
    const user = await this.authService.validateUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }

    // Simple log: only show role and login status
    console.log(`👤 User login: ${user.email} (${user.role})`);

    return user;
  }
}
