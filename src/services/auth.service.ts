import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserRepository } from "../repositories/user.repository";
import { RefreshTokenRepository } from "../repositories/refresh-token.repository";
import { User } from "../entities/user.entity";
import { RegisterDto, LoginDto } from "../dto/auth.dto";
import { UserResponse } from "../interfaces/user.interface";

@Injectable()
export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private jwtService: JwtService,
    private refreshTokenRepository: RefreshTokenRepository
  ) {}

  async register(
    registerDto: RegisterDto
  ): Promise<{ user: UserResponse; token: string; refreshToken: string }> {
    const { email, password, name } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictException("Email already exists");
    }

    // Create new user
    const user = await this.userRepository.create({
      email,
      password,
      name: name || email.split("@")[0],
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
    const refreshTokenEntity = await this.refreshTokenRepository.createRefreshToken(user.id, 30);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
      refreshToken: refreshTokenEntity.token,
    };
  }

  async login(
    loginDto: LoginDto
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

    // Generate JWT access token (15m)
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };
    const token = this.jwtService.sign(payload);

    // Generate refresh token (30d)
    const refreshTokenEntity = await this.refreshTokenRepository.createRefreshToken(user.id, 30);

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

  async refreshAccessToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    const refreshTokenEntity = await this.refreshTokenRepository.findByToken(refreshToken);

    if (!refreshTokenEntity) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (refreshTokenEntity.isRevoked) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (new Date() > refreshTokenEntity.expiresAt) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    const user = await this.userRepository.findById(refreshTokenEntity.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
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
    const newRefreshTokenEntity = await this.refreshTokenRepository.createRefreshToken(user.id, 30);

    return {
      token: newAccessToken,
      refreshToken: newRefreshTokenEntity.token,
    };
  }

  async validateGoogleUser(googleData: {
    email: string;
    name: string;
    image?: string;
    googleId: string;
  }): Promise<{ user: UserResponse; token: string; refreshToken: string }> {
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
    const refreshTokenEntity = await this.refreshTokenRepository.createRefreshToken(user.id, 30);

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
