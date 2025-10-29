import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserRepository } from "../repositories/user.repository";
import { User } from "../entities/user.entity";
import { RegisterDto, LoginDto } from "../dto/auth.dto";
import { UserResponse } from "../interfaces/user.interface";

@Injectable()
export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private jwtService: JwtService
  ) {}

  async register(
    registerDto: RegisterDto
  ): Promise<{ user: UserResponse; token: string }> {
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
      name: name || email.split("@")[0], // Use email prefix as default name
    });

    // Generate JWT token with role
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };
    const token = this.jwtService.sign(payload);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  async login(
    loginDto: LoginDto
  ): Promise<{ user: UserResponse; token: string }> {
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

    // Generate JWT token with role
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };
    const token = this.jwtService.sign(payload);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  async validateUser(userId: number): Promise<User> {
    return this.userRepository.findById(userId);
  }

  async validateGoogleUser(googleData: {
    email: string;
    name: string;
    image?: string;
    googleId: string;
  }): Promise<{ user: UserResponse; token: string }> {
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

    // Generate JWT token with role
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      image: user.image,
    };
    const token = this.jwtService.sign(payload);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }
}
