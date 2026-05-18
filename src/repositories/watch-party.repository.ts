import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan } from "typeorm";
import { WatchParty } from "../entities/watch-party.entity";

@Injectable()
export class WatchPartyRepository {
  constructor(
    @InjectRepository(WatchParty)
    private readonly repository: Repository<WatchParty>
  ) {}

  async create(data: {
    inviteCode: string;
    hostId: number;
    movieId?: number;
    tvId?: number;
    season?: number;
    episode?: number;
    streamUrl: string;
    contentTitle: string;
    posterUrl?: string;
    expiresAt: Date;
  }): Promise<WatchParty> {
    const party = this.repository.create({
      inviteCode: data.inviteCode,
      hostId: data.hostId,
      movieId: data.movieId ?? null,
      tvId: data.tvId ?? null,
      season: data.season ?? null,
      episode: data.episode ?? null,
      streamUrl: data.streamUrl,
      contentTitle: data.contentTitle,
      posterUrl: data.posterUrl ?? null,
      isActive: true,
      expiresAt: data.expiresAt,
    });
    return this.repository.save(party);
  }

  async findByInviteCode(inviteCode: string): Promise<WatchParty | null> {
    return this.repository.findOne({
      where: { inviteCode },
      relations: ["host"],
    });
  }

  async findById(id: number): Promise<WatchParty | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["host"],
    });
  }

  async codeExists(inviteCode: string): Promise<boolean> {
    const count = await this.repository.count({ where: { inviteCode } });
    return count > 0;
  }

  async extendExpiry(id: number): Promise<void> {
    const party = await this.repository.findOne({ where: { id } });
    if (!party) return;

    const maxExpiry = new Date(party.createdAt.getTime() + 6 * 60 * 60 * 1000);
    const extended = new Date(Date.now() + 30 * 60 * 1000);
    party.expiresAt = extended < maxExpiry ? extended : maxExpiry;
    await this.repository.save(party);
  }

  async deactivate(id: number): Promise<void> {
    await this.repository.update(id, { isActive: false });
  }

  async cleanupExpired(): Promise<void> {
    await this.repository.delete({
      isActive: false,
      expiresAt: LessThan(new Date()),
    });
  }
}
