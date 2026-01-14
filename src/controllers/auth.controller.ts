import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpCode,
  Get,
  Put,
  UseGuards,
  Request,
} from "@nestjs/common";
import { AuthService } from "../services/auth.service";
import { UserActivityLoggerService } from "../services/user-activity-logger.service";
import { RegisterDto, LoginDto } from "../dto/auth.dto";
import { ApiResponse } from "../interfaces/api.interface";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { IsEmail, IsString, IsOptional } from "class-validator";
import { UpdateProfileDto } from "../dto/profile.dto";
import * as geoip from "geoip-lite";

export class GoogleAuthDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsString()
  googleId: string;
}

@Controller("auth")
export class AuthController {
  constructor(
    private authService: AuthService,
    private userActivityLogger: UserActivityLoggerService
  ) {}

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerDto: RegisterDto,
    @Request() req
  ): Promise<ApiResponse> {
    try {
      const result = await this.authService.register(
        registerDto,
        this.extractRequestMetadata(req)
      );

      return {
        success: true,
        message: "User registered successfully",
        data: result,
      };
    } catch (error) {
      const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      return {
        success: false,
        message: error.message || "Registration failed",
        error: error.message,
      };
    }
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Request() req
  ): Promise<ApiResponse> {
    try {
      const result = await this.authService.login(
        loginDto,
        this.extractRequestMetadata(req)
      );

      // Log login activity
      const metadata = this.extractRequestMetadata(req);
      await this.userActivityLogger.logLogin({
        userId: result.user.id,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        country: metadata.country,
        device: this.detectDevice(metadata.userAgent),
      });

      return {
        success: true,
        message: "Login successful",
        data: result,
      };
    } catch (error) {
      const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      return {
        success: false,
        message: error.message || "Login failed",
        error: error.message,
      };
    }
  }

  @Post("google")
  @HttpCode(HttpStatus.OK)
  async googleAuth(
    @Body() googleUser: GoogleAuthDto,
    @Request() req
  ): Promise<ApiResponse> {
    console.log("🔍 [AUTH] Raw request body type:", typeof googleUser);
    console.log(
      "🔍 [AUTH] Raw request body keys:",
      Object.keys(googleUser || {})
    );
    console.log(
      "🔍 [AUTH] Raw request body:",
      JSON.stringify(googleUser, null, 2)
    );

    // Validate required fields
    if (!googleUser || !googleUser.email || !googleUser.googleId) {
      console.error("❌ [AUTH] Invalid request body:", {
        hasBody: !!googleUser,
        hasEmail: !!googleUser?.email,
        hasGoogleId: !!googleUser?.googleId,
      });
      return {
        success: false,
        message: "Invalid request data. Email and Google ID are required.",
        error: "Missing required fields",
      };
    }

    try {
      const result = await this.authService.validateGoogleUser(
        googleUser,
        this.extractRequestMetadata(req)
      );

      // Simple log: just show successful Google login with role
      console.log(
        `👤 Google login: ${result.user.email} (${result.user.role})`
      );

      // Log login activity
      const metadata = this.extractRequestMetadata(req);
      await this.userActivityLogger.logLogin({
        userId: result.user.id,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        country: metadata.country,
        device: this.detectDevice(metadata.userAgent),
      });

      return {
        success: true,
        message: "Google login successful",
        data: result,
      };
    } catch (error) {
      const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      return {
        success: false,
        message: error.message || "Google login failed",
        error: error.message,
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  @HttpCode(HttpStatus.OK)
  async getProfile(@Request() req): Promise<ApiResponse> {
    return {
      success: true,
      message: "Profile retrieved successfully",
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          image: req.user.image,
          role: req.user.role,
        },
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Put("profile")
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Request() req,
    @Body() body: UpdateProfileDto
  ): Promise<ApiResponse> {
    try {
      const user = await this.authService.updateProfile(req.user.id, body);
      return {
        success: true,
        message: "Profile updated",
        data: { user },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to update profile",
        error: error.message,
      };
    }
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Body("refreshToken") refreshToken: string,
    @Request() req
  ): Promise<ApiResponse> {
    if (!refreshToken) {
      return {
        success: false,
        message: "Refresh token is required",
        error: "Missing refresh token",
      };
    }

    try {
      const result = await this.authService.refreshAccessToken(
        refreshToken,
        this.extractRequestMetadata(req)
      );

      return {
        success: true,
        message: "Token refreshed successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Token refresh failed",
        error: error.message,
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@Body("refreshToken") refreshToken?: string): Promise<ApiResponse> {
    // Revoke refresh token if provided
    if (refreshToken) {
      try {
        await this.authService.revokeRefreshToken(refreshToken);
      } catch (error) {
        console.error("Error revoking refresh token:", error);
      }
    }

    return {
      success: true,
      message: "Logged out successfully",
      data: null,
    };
  }

  private extractRequestMetadata(req: any) {
    const cfIp = req?.headers?.["cf-connecting-ip"];
    const trueClientIp = req?.headers?.["true-client-ip"];
    const forwarded = req?.headers?.["x-forwarded-for"];
    const realIp = req?.headers?.["x-real-ip"];
    const rawIp =
      (typeof cfIp === "string" ? cfIp : undefined) ||
      (typeof trueClientIp === "string" ? trueClientIp : undefined) ||
      (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]) ||
      (Array.isArray(realIp) ? realIp[0] : realIp) ||
      req?.ip ||
      req?.connection?.remoteAddress;

    const ipAddress =
      typeof rawIp === "string"
        ? rawIp.trim()
        : Array.isArray(rawIp)
        ? rawIp[0]
        : undefined;

    const userAgentHeader = req?.headers?.["user-agent"];
    const countryHeader =
      (req?.headers?.["cf-ipcountry"] as string) ||
      (req?.headers?.["x-vercel-ip-country"] as string);

    const country =
      typeof countryHeader === "string" && countryHeader.length === 2
        ? countryHeader.toUpperCase()
        : ipAddress
        ? geoip.lookup?.(this.stripIpPrefix(ipAddress))?.country || null
        : null;

    return {
      ipAddress: this.stripIpPrefix(ipAddress),
      userAgent:
        typeof userAgentHeader === "string" ? userAgentHeader : undefined,
      country,
    };
  }

  private stripIpPrefix(ip?: string) {
    if (!ip) return undefined;
    const trimmed = ip.trim();
    if (trimmed.startsWith("::ffff:")) {
      return trimmed.replace("::ffff:", "");
    }
    if (trimmed.includes(":") && trimmed.includes(".")) {
      // Strip port if appended, keep IPv6 intact
      return trimmed.split(":")[0];
    }
    return trimmed;
  }

  private detectDevice(userAgent?: string): string {
    if (!userAgent) return "unknown";
    const ua = userAgent.toLowerCase();
    if (ua.includes("mobile")) return "mobile";
    if (ua.includes("tablet") || ua.includes("ipad")) return "tablet";
    return "desktop";
  }
}
