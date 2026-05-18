import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import * as crypto from "crypto";
import { WatchPartyRepository } from "../repositories/watch-party.repository";
import { CreateWatchPartyDto, WatchPartyResponseDto, WatchPartyPublicInfoDto } from "../dto/watch-party.dto";

const INVITE_URL_BASE = process.env.FRONTEND_URL || "http://localhost:3000";
const PARTY_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

@Injectable()
export class WatchPartyService {
  private readonly logger = new Logger(WatchPartyService.name);

  constructor(private readonly watchPartyRepository: WatchPartyRepository) {}

  async createParty(
    dto: CreateWatchPartyDto,
    hostId: number
  ): Promise<WatchPartyResponseDto> {
    const inviteCode = await this.generateUniqueCode();
    const expiresAt = new Date(Date.now() + PARTY_DURATION_MS);

    const party = await this.watchPartyRepository.create({
      inviteCode,
      hostId,
      movieId: dto.movieId,
      tvId: dto.tvId,
      season: dto.season,
      episode: dto.episode,
      streamUrl: dto.streamUrl,
      contentTitle: dto.contentTitle,
      posterUrl: dto.posterUrl,
      expiresAt,
    });

    const hostName = party.host?.name ?? "Host";

    this.logger.log(`Watch party created: ${inviteCode} by user ${hostId}`);

    return {
      id: party.id,
      inviteCode: party.inviteCode,
      inviteUrl: `${INVITE_URL_BASE}/watch-party/${party.inviteCode}`,
      contentTitle: party.contentTitle,
      posterUrl: party.posterUrl,
      movieId: party.movieId,
      tvId: party.tvId,
      season: party.season,
      episode: party.episode,
      streamUrl: party.streamUrl,
      hostId: party.hostId,
      hostName,
      isActive: party.isActive,
      expiresAt: party.expiresAt,
      createdAt: party.createdAt,
    };
  }

  async getPartyByCode(inviteCode: string): Promise<WatchPartyPublicInfoDto> {
    const party = await this.watchPartyRepository.findByInviteCode(inviteCode);

    if (!party) {
      throw new NotFoundException("Phòng xem không tồn tại");
    }

    if (!party.isActive || party.expiresAt < new Date()) {
      throw new NotFoundException("Phòng xem đã kết thúc hoặc hết hạn");
    }

    return {
      id: party.id,
      inviteCode: party.inviteCode,
      contentTitle: party.contentTitle,
      posterUrl: party.posterUrl,
      movieId: party.movieId,
      tvId: party.tvId,
      season: party.season,
      episode: party.episode,
      hostName: party.host?.name ?? "Host",
      isActive: party.isActive,
      expiresAt: party.expiresAt,
    };
  }

  async getPartyWithStreamUrl(inviteCode: string, requesterId: number | null): Promise<WatchPartyResponseDto> {
    const party = await this.watchPartyRepository.findByInviteCode(inviteCode);

    if (!party) {
      throw new NotFoundException("Phòng xem không tồn tại");
    }

    if (!party.isActive || party.expiresAt < new Date()) {
      throw new NotFoundException("Phòng xem đã kết thúc hoặc hết hạn");
    }

    return {
      id: party.id,
      inviteCode: party.inviteCode,
      inviteUrl: `${INVITE_URL_BASE}/watch-party/${party.inviteCode}`,
      contentTitle: party.contentTitle,
      posterUrl: party.posterUrl,
      movieId: party.movieId,
      tvId: party.tvId,
      season: party.season,
      episode: party.episode,
      streamUrl: party.streamUrl,
      hostId: party.hostId,
      hostName: party.host?.name ?? "Host",
      isActive: party.isActive,
      expiresAt: party.expiresAt,
      createdAt: party.createdAt,
    };
  }

  async endParty(partyId: number, requesterId: number): Promise<void> {
    const party = await this.watchPartyRepository.findById(partyId);

    if (!party) {
      throw new NotFoundException("Phòng xem không tồn tại");
    }

    if (party.hostId !== requesterId) {
      throw new ForbiddenException("Chỉ host mới có thể kết thúc phòng");
    }

    await this.watchPartyRepository.deactivate(partyId);
    this.logger.log(`Watch party ${partyId} ended by host ${requesterId}`);
  }

  async extendExpiry(partyId: number): Promise<void> {
    await this.watchPartyRepository.extendExpiry(partyId);
  }

  async deactivate(partyId: number): Promise<void> {
    await this.watchPartyRepository.deactivate(partyId);
  }

  private async generateUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = crypto.randomBytes(4).toString("hex");
      const exists = await this.watchPartyRepository.codeExists(code);
      if (!exists) return code;
    }
    // Fallback with more entropy
    return crypto.randomBytes(6).toString("hex").slice(0, 10);
  }
}
