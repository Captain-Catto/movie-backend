import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from './auth.service';
import { UnauthorizedException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { createMockJwtService } from '@/__tests__/utils/typeorm-mocks';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: any;
  let jwtService: ReturnType<typeof createMockJwtService>;
  let refreshTokenRepository: any;
  let adminSettingsService: any;

  beforeEach(() => {
    // Mock UserRepository
    userRepository = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    };

    // Mock JwtService
    jwtService = createMockJwtService();

    // Mock RefreshTokenRepository
    refreshTokenRepository = {
      createRefreshToken: vi.fn(),
      findByToken: vi.fn(),
      revokeToken: vi.fn(),
    };

    // Mock AdminSettingsService
    adminSettingsService = {
      getRegistrationSettings: vi.fn(),
    };

    service = new AuthService(
      userRepository,
      jwtService,
      refreshTokenRepository,
      adminSettingsService
    );
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const registrationSettings = {
        nickname: { min: 3, max: 50 },
        password: { min: 6, max: 100 },
      };

      const createdUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed_password',
        name: 'Test User',
        role: 'user',
        lastLoginAt: new Date(),
      };

      const refreshTokenEntity = {
        token: 'refresh_token_123',
        userId: 1,
        expiresAt: new Date(),
      };

      adminSettingsService.getRegistrationSettings.mockResolvedValue(registrationSettings);
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(createdUser);
      refreshTokenRepository.createRefreshToken.mockResolvedValue(refreshTokenEntity);
      jwtService.sign.mockReturnValue('jwt_token_123');

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token', 'jwt_token_123');
      expect(result).toHaveProperty('refreshToken', 'refresh_token_123');
      expect(result.user).not.toHaveProperty('password');
      expect(userRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(userRepository.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if user already exists', async () => {
      const registerDto = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const registrationSettings = {
        nickname: { min: 3, max: 50 },
        password: { min: 6, max: 100 },
      };

      const existingUser = {
        id: 1,
        email: 'existing@example.com',
      };

      adminSettingsService.getRegistrationSettings.mockResolvedValue(registrationSettings);
      userRepository.findByEmail.mockResolvedValue(existingUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      await expect(service.register(registerDto)).rejects.toThrow('Email already exists');
    });

    it('should throw BadRequestException if name is too short', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'ab',
      };

      const registrationSettings = {
        nickname: { min: 3, max: 50 },
        password: { min: 6, max: 100 },
      };

      adminSettingsService.getRegistrationSettings.mockResolvedValue(registrationSettings);

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if password is too short', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: '12345',
        name: 'Test User',
      };

      const registrationSettings = {
        nickname: { min: 3, max: 50 },
        password: { min: 6, max: 100 },
      };

      adminSettingsService.getRegistrationSettings.mockResolvedValue(registrationSettings);

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
    });

    it('should use email prefix as name if name not provided', async () => {
      const registerDto = {
        email: 'testuser@example.com',
        password: 'password123',
      };

      const registrationSettings = {
        nickname: { min: 3, max: 50 },
        password: { min: 6, max: 100 },
      };

      const createdUser = {
        id: 1,
        email: 'testuser@example.com',
        password: 'hashed_password',
        name: 'testuser',
        role: 'user',
      };

      adminSettingsService.getRegistrationSettings.mockResolvedValue(registrationSettings);
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(createdUser);
      refreshTokenRepository.createRefreshToken.mockResolvedValue({ token: 'refresh_token' });

      await service.register(registerDto);

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'testuser',
        })
      );
    });

    it('should include request metadata in user creation', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const requestMetadata = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        country: 'US',
      };

      const registrationSettings = {
        nickname: { min: 3, max: 50 },
        password: { min: 6, max: 100 },
      };

      const createdUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed_password',
        name: 'Test User',
        role: 'user',
        lastLoginAt: expect.any(Date),
        lastLoginIp: '192.168.1.1',
        lastLoginDevice: 'mobile',
        lastLoginCountry: 'US',
      };

      adminSettingsService.getRegistrationSettings.mockResolvedValue(registrationSettings);
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(createdUser);
      refreshTokenRepository.createRefreshToken.mockResolvedValue({ token: 'refresh_token' });

      await service.register(registerDto, requestMetadata);

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lastLoginIp: '192.168.1.1',
          lastLoginDevice: 'mobile',
        })
      );
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const user = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed_password',
        name: 'Test User',
        role: 'user',
        isActive: true,
        provider: 'email',
        comparePassword: vi.fn().mockResolvedValue(true),
      };

      const refreshTokenEntity = {
        token: 'refresh_token_123',
        userId: 1,
      };

      userRepository.findByEmail.mockResolvedValue(user);
      userRepository.update.mockResolvedValue(user);
      refreshTokenRepository.createRefreshToken.mockResolvedValue(refreshTokenEntity);
      jwtService.sign.mockReturnValue('jwt_token_123');

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token', 'jwt_token_123');
      expect(result).toHaveProperty('refreshToken', 'refresh_token_123');
      expect(result.user).not.toHaveProperty('password');
      expect(user.comparePassword).toHaveBeenCalledWith('password123');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      userRepository.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException if account is inactive', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const user = {
        id: 1,
        email: 'test@example.com',
        isActive: false,
      };

      userRepository.findByEmail.mockResolvedValue(user);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Account is disabled');
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const user = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed_password',
        isActive: true,
        provider: 'email',
        comparePassword: vi.fn().mockResolvedValue(false),
      };

      userRepository.findByEmail.mockResolvedValue(user);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException if user registered with OAuth', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const user = {
        id: 1,
        email: 'test@example.com',
        password: null,
        isActive: true,
        provider: 'google',
      };

      userRepository.findByEmail.mockResolvedValue(user);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('This account was registered with google');
    });

    it('should update login metadata', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const requestMetadata = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        country: 'VN',
      };

      const user = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed_password',
        isActive: true,
        provider: 'email',
        comparePassword: vi.fn().mockResolvedValue(true),
      };

      userRepository.findByEmail.mockResolvedValue(user);
      userRepository.update.mockResolvedValue(user);
      refreshTokenRepository.createRefreshToken.mockResolvedValue({ token: 'refresh_token' });

      await service.login(loginDto, requestMetadata);

      expect(userRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          lastLoginAt: expect.any(Date),
          lastLoginIp: '192.168.1.1',
          lastLoginDevice: 'desktop',
        })
      );
    });
  });

  describe('validateUser', () => {
    it('should return user by id', async () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
      };

      userRepository.findById.mockResolvedValue(user);

      const result = await service.validateUser(1);

      expect(result).toEqual(user);
      expect(userRepository.findById).toHaveBeenCalledWith(1);
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh access token successfully', async () => {
      const refreshToken = 'valid_refresh_token';
      const refreshTokenEntity = {
        id: 1,
        token: refreshToken,
        userId: 1,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 86400000), // Tomorrow
      };

      const user = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
      };

      const newRefreshTokenEntity = {
        token: 'new_refresh_token',
        userId: 1,
      };

      refreshTokenRepository.findByToken.mockResolvedValue(refreshTokenEntity);
      userRepository.findById.mockResolvedValue(user);
      refreshTokenRepository.revokeToken.mockResolvedValue(undefined);
      refreshTokenRepository.createRefreshToken.mockResolvedValue(newRefreshTokenEntity);
      jwtService.sign.mockReturnValue('new_jwt_token');

      const result = await service.refreshAccessToken(refreshToken);

      expect(result).toHaveProperty('token', 'new_jwt_token');
      expect(result).toHaveProperty('refreshToken', 'new_refresh_token');
      expect(refreshTokenRepository.revokeToken).toHaveBeenCalledWith(refreshToken);
    });

    it('should throw UnauthorizedException if refresh token not found', async () => {
      refreshTokenRepository.findByToken.mockResolvedValue(null);

      await expect(service.refreshAccessToken('invalid_token')).rejects.toThrow(UnauthorizedException);
      await expect(service.refreshAccessToken('invalid_token')).rejects.toThrow('Invalid refresh token');
    });

    it('should throw UnauthorizedException if refresh token is revoked', async () => {
      const refreshTokenEntity = {
        token: 'revoked_token',
        isRevoked: true,
        expiresAt: new Date(Date.now() + 86400000),
      };

      refreshTokenRepository.findByToken.mockResolvedValue(refreshTokenEntity);

      await expect(service.refreshAccessToken('revoked_token')).rejects.toThrow(UnauthorizedException);
      await expect(service.refreshAccessToken('revoked_token')).rejects.toThrow('Refresh token has been revoked');
    });

    it('should throw UnauthorizedException if refresh token is expired', async () => {
      const refreshTokenEntity = {
        token: 'expired_token',
        isRevoked: false,
        expiresAt: new Date(Date.now() - 86400000), // Yesterday
      };

      refreshTokenRepository.findByToken.mockResolvedValue(refreshTokenEntity);

      await expect(service.refreshAccessToken('expired_token')).rejects.toThrow(UnauthorizedException);
      await expect(service.refreshAccessToken('expired_token')).rejects.toThrow('Refresh token has expired');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const refreshTokenEntity = {
        token: 'valid_token',
        userId: 999,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 86400000),
      };

      refreshTokenRepository.findByToken.mockResolvedValue(refreshTokenEntity);
      userRepository.findById.mockResolvedValue(null);

      await expect(service.refreshAccessToken('valid_token')).rejects.toThrow(UnauthorizedException);
      await expect(service.refreshAccessToken('valid_token')).rejects.toThrow('User not found');
    });
  });

  describe('validateGoogleUser', () => {
    it('should create new user for first-time Google login', async () => {
      const googleData = {
        email: 'google@example.com',
        name: 'Google User',
        image: 'https://example.com/image.jpg',
        googleId: 'google_123',
      };

      const createdUser = {
        id: 1,
        email: 'google@example.com',
        name: 'Google User',
        image: 'https://example.com/image.jpg',
        googleId: 'google_123',
        provider: 'google',
        password: null,
      };

      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(createdUser);
      userRepository.update.mockResolvedValue(createdUser);
      refreshTokenRepository.createRefreshToken.mockResolvedValue({ token: 'refresh_token' });
      jwtService.sign.mockReturnValue('jwt_token');

      const result = await service.validateGoogleUser(googleData);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token', 'jwt_token');
      expect(result.user).not.toHaveProperty('password');
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'google@example.com',
          googleId: 'google_123',
          provider: 'google',
          password: null,
        })
      );
    });

    it('should link Google account to existing user without googleId', async () => {
      const googleData = {
        email: 'existing@example.com',
        name: 'Existing User',
        image: 'https://example.com/image.jpg',
        googleId: 'google_456',
      };

      const existingUser = {
        id: 2,
        email: 'existing@example.com',
        name: 'Existing User',
        googleId: null,
        password: 'hashed_password',
      };

      const updatedUser = {
        ...existingUser,
        googleId: 'google_456',
        provider: 'google',
        image: 'https://example.com/image.jpg',
      };

      userRepository.findByEmail.mockResolvedValue(existingUser);
      userRepository.update.mockResolvedValue(updatedUser);
      refreshTokenRepository.createRefreshToken.mockResolvedValue({ token: 'refresh_token' });
      jwtService.sign.mockReturnValue('jwt_token');

      const result = await service.validateGoogleUser(googleData);

      expect(result).toHaveProperty('user');
      expect(userRepository.update).toHaveBeenCalledWith(
        2,
        expect.objectContaining({
          googleId: 'google_456',
          provider: 'google',
        })
      );
    });

    it('should throw error if email is missing', async () => {
      const googleData = {
        email: '',
        name: 'Test User',
        googleId: 'google_789',
      };

      await expect(service.validateGoogleUser(googleData)).rejects.toThrow('Email and Google ID are required');
    });

    it('should throw error if googleId is missing', async () => {
      const googleData = {
        email: 'test@example.com',
        name: 'Test User',
        googleId: '',
      };

      await expect(service.validateGoogleUser(googleData)).rejects.toThrow('Email and Google ID are required');
    });
  });

  describe('revokeRefreshToken', () => {
    it('should revoke refresh token', async () => {
      const refreshToken = 'token_to_revoke';
      refreshTokenRepository.revokeToken.mockResolvedValue(undefined);

      await service.revokeRefreshToken(refreshToken);

      expect(refreshTokenRepository.revokeToken).toHaveBeenCalledWith(refreshToken);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const userId = 1;
      const updateDto = {
        name: 'Updated Name',
        image: 'https://example.com/new-image.jpg',
      };

      const user = {
        id: 1,
        email: 'test@example.com',
        name: 'Old Name',
        password: 'hashed_password',
        image: 'https://example.com/old-image.jpg',
      };

      const updatedUser = {
        ...user,
        name: 'Updated Name',
        image: 'https://example.com/new-image.jpg',
      };

      userRepository.findById.mockResolvedValue(user);
      userRepository.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile(userId, updateDto);

      expect(result.name).toBe('Updated Name');
      expect(result.image).toBe('https://example.com/new-image.jpg');
      expect(result).not.toHaveProperty('password');
      expect(userRepository.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = 999;
      const updateDto = { name: 'New Name' };

      userRepository.findById.mockResolvedValue(null);

      await expect(service.updateProfile(userId, updateDto)).rejects.toThrow(NotFoundException);
      await expect(service.updateProfile(userId, updateDto)).rejects.toThrow('User not found');
    });

    it('should update password when provided', async () => {
      const userId = 1;
      const updateDto = {
        password: 'newpassword123',
      };

      const user = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        password: 'old_hashed_password',
      };

      userRepository.findById.mockResolvedValue(user);
      userRepository.update.mockResolvedValue({ ...user, password: 'new_hashed_password' });

      await service.updateProfile(userId, updateDto);

      // Verify update was called (password will be hashed internally)
      expect(userRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          id: 1,
          email: 'test@example.com',
        })
      );
    });
  });
});
