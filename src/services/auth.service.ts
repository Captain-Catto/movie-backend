import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserRepository } from "../repositories/user.repository";
import { RefreshTokenRepository } from "../repositories/refresh-token.repository";
import { User } from "../entities/user.entity";
import { RegisterDto, LoginDto } from "../dto/auth.dto";
import { UserResponse } from "../interfaces/user.interface";
import { AdminSettingsService } from "./admin-settings.service";

interface RequestMetadata {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private jwtService: JwtService,
    private refreshTokenRepository: RefreshTokenRepository,
    private adminSettingsService: AdminSettingsService
  ) {}

  private detectDeviceType(userAgent?: string): string | null {
    if (!userAgent) return null;

    const normalized = userAgent.toLowerCase();

    if (
      normalized.includes("mobile") ||
      normalized.includes("iphone") ||
      normalized.includes("android")
    ) {
      return "mobile";
    }

    if (normalized.includes("ipad") || normalized.includes("tablet")) {
      return "tablet";
    }

    return "desktop";
  }

  private buildLoginMetadata(metadata?: RequestMetadata): Partial<User> {
    const loginData: Partial<User> = {
      lastLoginAt: new Date(),
    };

    if (metadata?.ipAddress) {
      loginData.lastLoginIp = metadata.ipAddress;
    }

    if (metadata?.userAgent) {
      const deviceType = this.detectDeviceType(metadata.userAgent);
      if (deviceType) {
        loginData.lastLoginDevice = deviceType;
      }
    }

    return loginData;
  }

  private validateRegistrationInputs(
    dto: RegisterDto,
    settings: {
      nickname: { min: number; max: number };
      password: { min: number; max: number };
    }
  ) {
    if (
      dto.name &&
      (dto.name.length < settings.nickname.min ||
        dto.name.length > settings.nickname.max)
    ) {
      throw new BadRequestException(
        `Tên phải từ ${settings.nickname.min}-${settings.nickname.max} ký tự`
      );
    }

    if (
      dto.password.length < settings.password.min ||
      dto.password.length > settings.password.max
    ) {
      throw new BadRequestException(
        `Mật khẩu phải từ ${settings.password.min}-${settings.password.max} ký tự`
      );
    }
  }

  async register(
    registerDto: RegisterDto,
    requestMetadata?: RequestMetadata
  ): Promise<{ user: UserResponse; token: string; refreshToken: string }> {
    const { email, password, name } = registerDto;

    const registrationSettings =
      await this.adminSettingsService.getRegistrationSettings();
    this.validateRegistrationInputs(registerDto, registrationSettings);

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictException("Email already exists");
    }

    const loginMetadata = this.buildLoginMetadata(requestMetadata);

    // Create new user
    const user = await this.userRepository.create({
      email,
      password,
      name: name || email.split("@")[0],
      ...loginMetadata,
    });

    // Generate JWT access token (15m)
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };
    const token = this.jwtService.sign(payload);

    // Generate refresh token (30d)
    const refreshTokenEntity =
      await this.refreshTokenRepository.createRefreshToken(
        user.id,
        30,
        requestMetadata?.ipAddress,
        requestMetadata?.userAgent
      );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
      refreshToken: refreshTokenEntity.token,
    };
  }

  async login(
    loginDto: LoginDto,
    requestMetadata?: RequestMetadata
  ): Promise<{ user: UserResponse; token: string; refreshToken: string }> {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Check if user account is active
    if (!user.isActive) {
      throw new UnauthorizedException("Account is disabled");
    }

    // Check if user registered with OAuth (no password)
    if (!user.password && user.provider !== "email") {
      throw new UnauthorizedException(
        `This account was registered with ${user.provider}. Please use ${user.provider} to login.`
      );
    }

    // Validate password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const loginMetadata = this.buildLoginMetadata(requestMetadata);
    await this.userRepository.update(user.id, loginMetadata);
    Object.assign(user, loginMetadata);

    // Generate JWT access token (15m)
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };
    const token = this.jwtService.sign(payload);

    // Generate refresh token (30d)
    const refreshTokenEntity =
      await this.refreshTokenRepository.createRefreshToken(
        user.id,
        30,
        requestMetadata?.ipAddress,
        requestMetadata?.userAgent
      );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
      refreshToken: refreshTokenEntity.token,
    };
  }

  async validateUser(userId: number): Promise<User> {
    return this.userRepository.findById(userId);
  }

  async refreshAccessToken(
    refreshToken: string,
    requestMetadata?: RequestMetadata
  ): Promise<{ token: string; refreshToken: string }> {
    const refreshTokenEntity = await this.refreshTokenRepository.findByToken(
      refreshToken
    );

    if (!refreshTokenEntity) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (refreshTokenEntity.isRevoked) {
      throw new UnauthorizedException("Refresh token has been revoked");
    }

    if (new Date() > refreshTokenEntity.expiresAt) {
      throw new UnauthorizedException("Refresh token has expired");
    }

    const user = await this.userRepository.findById(refreshTokenEntity.userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    // Generate new access token
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };
    const newAccessToken = this.jwtService.sign(payload);

    // Generate new refresh token and revoke old one
    await this.refreshTokenRepository.revokeToken(refreshToken);
    const newRefreshTokenEntity =
      await this.refreshTokenRepository.createRefreshToken(
        user.id,
        30,
        requestMetadata?.ipAddress,
        requestMetadata?.userAgent
      );

    return {
      token: newAccessToken,
      refreshToken: newRefreshTokenEntity.token,
    };
  }

  async validateGoogleUser(
    googleData: {
      email: string;
      name: string;
      image?: string;
      googleId: string;
    },
    requestMetadata?: RequestMetadata
  ): Promise<{ user: UserResponse; token: string; refreshToken: string }> {
    const { email, name, image, googleId } = googleData;

    // Validate required fields
    if (!email || !googleId) {
      throw new Error("Email and Google ID are required");
    }

    // Check if user exists by email or googleId
    let user = await this.userRepository.findByEmail(email);

    if (!user) {
      // Create new user from Google data
      console.log(`👤 Google register: ${email}`);

      const userData = {
        email,
        name,
        image,
        googleId,
        provider: "google",
        // No password for OAuth users
        password: null,
      };

      user = await this.userRepository.create(userData);
    } else {
      // Update existing user with Google data if needed
      if (!user.googleId) {
        console.log(`� Google link: ${email}`);

        const updateData = {
          googleId,
          provider: "google",
          name,
          image,
        };

        user.googleId = googleId;
        user.provider = "google";
        user.name = name;
        user.image = image;

        await this.userRepository.update(user.id, updateData);
      }
    }

    const loginMetadata = this.buildLoginMetadata(requestMetadata);
    await this.userRepository.update(user.id, loginMetadata);
    Object.assign(user, loginMetadata);

    // Generate JWT access token (15m)
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      image: user.image,
    };
    const token = this.jwtService.sign(payload);

    // Generate refresh token (30d)
    const refreshTokenEntity =
      await this.refreshTokenRepository.createRefreshToken(
        user.id,
        30,
        requestMetadata?.ipAddress,
        requestMetadata?.userAgent
      );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
      refreshToken: refreshTokenEntity.token,
    };
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    await this.refreshTokenRepository.revokeToken(refreshToken);
  }
}
