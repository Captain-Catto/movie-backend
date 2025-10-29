import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpCode,
  Get,
  UseGuards,
  Request,
} from "@nestjs/common";
import { AuthService } from "../services/auth.service";
import { RegisterDto, LoginDto } from "../dto/auth.dto";
import { ApiResponse } from "../interfaces/api.interface";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { IsEmail, IsString, IsOptional } from "class-validator";

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
  constructor(private authService: AuthService) {}

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto): Promise<ApiResponse> {
    try {
      const result = await this.authService.register(registerDto);

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
  async login(@Body() loginDto: LoginDto): Promise<ApiResponse> {
    try {
      const result = await this.authService.login(loginDto);

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
  async googleAuth(@Body() googleUser: GoogleAuthDto): Promise<ApiResponse> {
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
      const result = await this.authService.validateGoogleUser(googleUser);

      // Simple log: just show successful Google login with role
      console.log(
        `👤 Google login: ${result.user.email} (${result.user.role})`
      );

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
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(): Promise<ApiResponse> {
    // For JWT, logout is handled client-side by removing token
    return {
      success: true,
      message: "Logged out successfully",
      data: null,
    };
  }
}
