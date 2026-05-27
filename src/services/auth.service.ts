import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserRepository } from "../repositories/user.repository";
import { RefreshTokenRepository } from "../repositories/refresh-token.repository";
import { User } from "../entities/user.entity";
import { RegisterDto, LoginDto } from "../dto/auth.dto";
import { UserResponse } from "../interfaces/user.interface";
import { AdminSettingsService } from "./admin-settings.service";
import { UpdateProfileDto } from "../dto/profile.dto";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { EmailService } from "./email.service";
import { NotificationService } from "./notification.service";

interface RequestMetadata {
  ipAddress?: string;
  userAgent?: string;
  country?: string | null;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private userRepository: UserRepository,
    private jwtService: JwtService,
    private refreshTokenRepository: RefreshTokenRepository,
    private adminSettingsService: AdminSettingsService,
    private emailService: EmailService,
    @Inject(forwardRef(() => NotificationService))
    private notificationService: NotificationService
  ) {}

  private buildLoginMetadata(metadata?: RequestMetadata): Partial<User> {
    const loginData: Partial<User> = {
      lastLoginAt: new Date(),
    };

    if (metadata?.ipAddress) {
      loginData.lastLoginIp = metadata.ipAddress;
    }

    const deviceType = this.detectDeviceType(metadata?.userAgent);
    if (deviceType) {
      loginData.lastLoginDevice = deviceType;
    }

    if (metadata?.country) {
      loginData.lastLoginCountry = metadata.country;
    }

    return loginData;
  }

  private detectDeviceType(userAgent?: string): string | null {
    if (!userAgent) return null;
    const ua = userAgent.toLowerCase();
    if (ua.includes("mobile") || ua.includes("iphone") || ua.includes("android")) {
      return "mobile";
    }
    if (ua.includes("ipad") || ua.includes("tablet")) {
      return "tablet";
    }
    return "desktop";
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
    this.logger.debug("[AUTH] Registration metadata:", {
      ip: loginMetadata.lastLoginIp,
      device: loginMetadata.lastLoginDevice,
      country: requestMetadata?.country || null,
    });

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
        requestMetadata?.ipAddress
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
    this.logger.debug("[AUTH] Login metadata:", {
      ip: loginMetadata.lastLoginIp,
      device: loginMetadata.lastLoginDevice,
      country: requestMetadata?.country || null,
    });
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
        requestMetadata?.ipAddress
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
        requestMetadata?.ipAddress
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
      this.logger.debug(`Google register: ${email}`);

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
        this.logger.debug(`Google link: ${email}`);

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
        requestMetadata?.ipAddress
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

  async updateProfile(
    userId: number,
    dto: UpdateProfileDto
  ): Promise<UserResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (dto.name) {
      user.name = dto.name;
    }

    if (dto.password) {
      user.password = await bcrypt.hash(dto.password, 12);
    }

    if (dto.image) {
      user.image = dto.image;
    }

    const saved = await this.userRepository.update(user.id, user);
    const { password: _, ...rest } = saved;
    return rest as UserResponse;
  }

  async forgotPassword(email: string): Promise<boolean> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      this.logger.debug(`[forgotPassword] Email not found but returning success: ${email}`);
      return true; // Return true to prevent email enumeration attacks
    }

    if (!user.isActive) {
      this.logger.debug(`[forgotPassword] User is inactive: ${email}`);
      return true; // Do not send email to inactive users
    }

    // Generate secure random token
    const rawToken = crypto.randomBytes(32).toString("hex");
    
    // Hash token using SHA-256 to store in database (more secure than raw)
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const tokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await this.userRepository.update(user.id, {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: tokenExpiry,
    });

    this.logger.debug(`[forgotPassword] Generated reset token for ${email}`);
    
    // Send email using rawToken
    return this.emailService.sendPasswordResetEmail(email, rawToken);
  }

  async resetPassword(resetDto: { token: string; newPassword: string }): Promise<boolean> {
    const { token, newPassword } = resetDto;
    
    // Hash incoming raw token to match the database
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Query user by resetPasswordToken
    const user = await this.userRepository.findByResetToken(hashedToken);

    if (!user || !user.resetPasswordExpires || new Date(user.resetPasswordExpires) < new Date()) {
      throw new BadRequestException(
        "Mã khôi phục không hợp lệ hoặc đã hết hạn. Vui lòng thử lại."
      );
    }

    // Hash new password using bcrypt
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await this.userRepository.update(user.id, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });

    this.logger.log(`✅ Password successfully reset for user ID: ${user.id}`);

    // Trigger an in-app system notification
    try {
      await this.notificationService.sendPasswordResetNotification(user.id);
    } catch (err) {
      this.logger.error(`Failed to send in-app password reset notification: ${err.message}`);
    }

    return true;
  }
}
