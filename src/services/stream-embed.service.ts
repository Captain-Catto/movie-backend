import { Injectable, Logger } from "@nestjs/common";
import { AdminSettingsService } from "./admin-settings.service";
import {
  STREAM_EMBED_DEFAULT_DOMAINS,
  STREAM_EMBED_LEGACY_DOMAINS,
} from "../constants/stream.constants";

const LEGACY_DOMAIN_SET = new Set(STREAM_EMBED_LEGACY_DOMAINS);

export type StreamContentType = "movie" | "tv";

export interface StreamUrlQuery {
  tmdbId: number;
  contentType: StreamContentType;
  season?: number;
  episode?: number;
  dsLang?: string;
  autoplay?: boolean;
  autoNext?: boolean;
}

export interface StreamUrlResult {
  provider: "vsembed";
  tmdbId: number;
  contentType: StreamContentType;
  url: string;
  fallbackUrls: string[];
}

@Injectable()
export class StreamEmbedService {
  private readonly logger = new Logger(StreamEmbedService.name);
  private readonly defaultDomains = [...STREAM_EMBED_DEFAULT_DOMAINS];
  private readonly settingsCacheTtlMs = 60_000;
  private cachedDomains: string[] | null = null;
  private cacheExpiresAt = 0;

  constructor(private readonly adminSettingsService: AdminSettingsService) {}

  private async getEmbedDomains(): Promise<string[]> {
    const now = Date.now();
    if (this.cachedDomains && now < this.cacheExpiresAt) {
      this.logger.log(`[getEmbedDomains] cache hit: ${this.cachedDomains.join(', ')}`);
      return this.cachedDomains;
    }

    try {
      const settings = await this.adminSettingsService.getStreamDomainSettings();
      this.logger.log(`[getEmbedDomains] DB raw domains: ${JSON.stringify(settings.domains)}`);
      const filtered = (settings.domains || []).filter(
        (d) => !!d && !LEGACY_DOMAIN_SET.has(d)
      );
      this.logger.log(`[getEmbedDomains] after filter: ${JSON.stringify(filtered)}`);
      if (filtered.length > 0) {
        this.cachedDomains = filtered;
        this.cacheExpiresAt = now + this.settingsCacheTtlMs;
        return filtered;
      }
    } catch (error) {
      this.logger.warn(
        `Failed to load stream domains from settings, using defaults: ${error}`
      );
    }

    this.logger.log(`[getEmbedDomains] fallback to defaults: ${this.defaultDomains.join(', ')}`);
    this.cachedDomains = this.defaultDomains;
    this.cacheExpiresAt = now + this.settingsCacheTtlMs;
    return this.defaultDomains;
  }

  private isPathBasedDomain(domain: string): boolean {
    return /vidsrc\.to|vidsrc\.me|vidsrc\.xyz|vidsrc\.pm|vidsrc\.in/i.test(domain);
  }

  private buildEmbedUrl(domain: string, query: StreamUrlQuery): string {
    if (this.isPathBasedDomain(domain)) {
      // vidsrc.to path-based format: /embed/movie/{id} or /embed/tv/{id}/{season}/{episode}
      if (query.contentType === "movie") {
        return `${domain}/embed/movie/${query.tmdbId}`;
      }
      const season = query.season ?? 1;
      const episode = query.episode ?? 1;
      return `${domain}/embed/tv/${query.tmdbId}/${season}/${episode}`;
    }

    // vsembed/vidsrc-embed query-param format
    const embedPath = query.contentType === "movie" ? "/embed/movie" : "/embed/tv";
    const url = new URL(embedPath, domain);

    url.searchParams.set("tmdb", String(query.tmdbId));

    if (query.contentType === "tv") {
      if (query.season) url.searchParams.set("season", String(query.season));
      if (query.episode) url.searchParams.set("episode", String(query.episode));
      if (query.autoNext !== undefined) url.searchParams.set("autonext", query.autoNext ? "1" : "0");
    }

    if (query.dsLang) url.searchParams.set("ds_lang", query.dsLang);
    if (query.autoplay !== undefined) url.searchParams.set("autoplay", query.autoplay ? "1" : "0");

    return url.toString();
  }

  async buildStreamUrls(query: StreamUrlQuery): Promise<StreamUrlResult> {
    const domains = await this.getEmbedDomains();
    const urls = domains.map((domain) => this.buildEmbedUrl(domain, query));

    return {
      provider: "vsembed",
      tmdbId: query.tmdbId,
      contentType: query.contentType,
      url: urls[0],
      fallbackUrls: urls.slice(1),
    };
  }
}
