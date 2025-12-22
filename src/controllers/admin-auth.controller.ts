import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpCode,
  UnauthorizedException,
  Request,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuthService } from "../services/auth.service";
import { LoginDto } from "../dto/auth.dto";
import { ApiResponse } from "../interfaces/api.interface";
import { User, UserRole } from "../entities/user.entity";

@Controller("admin/auth")
export class AdminAuthController {
  constructor(
    private authService: AuthService,
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async adminLogin(
    @Body() loginDto: LoginDto,
    @Request() req
  ): Promise<ApiResponse> {
    try {
      const result = await this.authService.login(
        loginDto,
        this.extractRequestMetadata(req)
      );

      // Check if user has admin role
      if (
        result.user.role !== UserRole.ADMIN &&
        result.user.role !== UserRole.SUPER_ADMIN
      ) {
        throw new UnauthorizedException(
          "Access denied. Admin privileges required."
        );
      }

      return {
        success: true,
        message: "Admin login successful",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Admin login failed",
        error: error.message,
      };
    }
  }

  // Endpoint công khai để promote user đầu tiên thành admin
  @Post("promote")
  @HttpCode(HttpStatus.OK)
  async promoteToAdmin(
    @Body() body: { email: string; secret: string }
  ): Promise<ApiResponse> {
    try {
      // Secret key để bảo mật
      const ADMIN_SECRET = process.env.ADMIN_PROMOTION_SECRET || "promote-admin-2024";

      if (body.secret !== ADMIN_SECRET) {
        return {
          success: false,
          message: "Invalid secret key",
          data: null,
        };
      }

      const user = await this.userRepository.findOne({
        where: { email: body.email },
      });

      if (!user) {
        return {
          success: false,
          message: `User with email ${body.email} not found`,
          data: null,
        };
      }

      user.role = UserRole.ADMIN;
      await this.userRepository.save(user);

      return {
        success: true,
        message: `User ${body.email} promoted to admin successfully. Please logout and login again.`,
        data: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to promote user",
        error: error.message,
      };
    }
  }

  private extractRequestMetadata(req: any) {
    const forwarded = req?.headers?.["x-forwarded-for"];
    const rawIp =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]) ||
      req?.ip ||
      req?.connection?.remoteAddress;

    const ipAddress =
      typeof rawIp === "string"
        ? rawIp.trim()
        : Array.isArray(rawIp)
        ? rawIp[0]
        : undefined;

    const userAgentHeader = req?.headers?.["user-agent"];

    return {
      ipAddress,
      userAgent:
        typeof userAgentHeader === "string" ? userAgentHeader : undefined,
    };
  }
}
