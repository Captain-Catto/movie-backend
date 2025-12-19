import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { SyncSettings } from "../entities/sync-settings.entity";
import { UpdateSyncSettingsDto } from "../dto/sync-settings.dto";

@Injectable()
export class SyncSettingsService {
  private readonly logger = new Logger(SyncSettingsService.name);

  constructor(
    @InjectRepository(SyncSettings)
    private readonly syncSettingsRepository: Repository<SyncSettings>,
    private readonly configService: ConfigService
  ) {}

  async getSettings(): Promise<SyncSettings> {
    let settings = await this.syncSettingsRepository.findOne({
      where: { id: 1 },
    });

    if (!settings) {
      const defaults = this.getDefaultLimits();
      settings = this.syncSettingsRepository.create({
        id: 1,
        ...defaults,
      });
      settings = await this.syncSettingsRepository.save(settings);
      this.logger.log(
        `Initialized sync settings with defaults: movies=${defaults.movieCatalogLimit}, tv=${defaults.tvCatalogLimit}, trending=${defaults.trendingCatalogLimit}`
      );
    }

    return settings;
  }

  async updateSettings(
    dto: UpdateSyncSettingsDto
  ): Promise<SyncSettings> {
    const settings = await this.getSettings();
    const updated = this.syncSettingsRepository.merge(settings, dto);
    return this.syncSettingsRepository.save({
      ...updated,
      id: 1,
    });
  }

  async getCatalogLimits(): Promise<{
    movieLimit: number;
    tvLimit: number;
    trendingLimit: number;
  }> {
    const settings = await this.getSettings();
    const defaults = this.getDefaultLimits();

    return {
      movieLimit: this.normalizeLimit(
        settings.movieCatalogLimit,
        defaults.movieCatalogLimit
      ),
      tvLimit: this.normalizeLimit(
        settings.tvCatalogLimit,
        defaults.tvCatalogLimit
      ),
      trendingLimit: this.normalizeLimit(
        settings.trendingCatalogLimit,
        defaults.trendingCatalogLimit
      ),
    };
  }

  private getDefaultLimits(): {
    movieCatalogLimit: number;
    tvCatalogLimit: number;
    trendingCatalogLimit: number;
  } {
    return {
      movieCatalogLimit: this.normalizeLimit(
        this.configService.get<number>("MOVIE_CATALOG_LIMIT"),
        500_000
      ),
      tvCatalogLimit: this.normalizeLimit(
        this.configService.get<number>("TV_CATALOG_LIMIT"),
        200_000
      ),
      trendingCatalogLimit: this.normalizeLimit(
        this.configService.get<number>("TRENDING_CATALOG_LIMIT"),
        100
      ),
    };
  }

  private normalizeLimit(value: number | string | undefined, fallback: number) {
    const parsed =
      typeof value === "string" ? parseInt(value, 10) : Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
    return fallback;
  }
}
