import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan } from "typeorm";
import { RefreshToken } from "../entities/refresh-token.entity";
import * as crypto from "crypto";

@Injectable()
export class RefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshToken)
    private repository: Repository<RefreshToken>
  ) {}

  async createRefreshToken(
    userId: number,
    expiresInDays: number = 30,
    ipAddress?: string,
    userAgent?: string
  ): Promise<RefreshToken> {
    const token = crypto.randomBytes(64).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const refreshToken = this.repository.create({
      token,
      userId,
      expiresAt,
      ipAddress,
      userAgent,
      isRevoked: false,
    });

    return this.repository.save(refreshToken);
  }

  async findByToken(token: string): Promise<RefreshToken | null> {
    return this.repository.findOne({
      where: { token, isRevoked: false },
      relations: ["user"],
    });
  }

  async revokeToken(token: string): Promise<void> {
    await this.repository.update({ token }, { isRevoked: true });
  }

  async revokeAllUserTokens(userId: number): Promise<void> {
    await this.repository.update({ userId, isRevoked: false }, { isRevoked: true });
  }

  async deleteExpiredTokens(): Promise<void> {
    await this.repository.delete({
      expiresAt: LessThan(new Date()),
    });
  }

  async isTokenValid(token: string): Promise<boolean> {
    const refreshToken = await this.findByToken(token);
    if (!refreshToken) return false;

    if (refreshToken.isRevoked) return false;
    if (new Date() > refreshToken.expiresAt) return false;

    return true;
  }
}
