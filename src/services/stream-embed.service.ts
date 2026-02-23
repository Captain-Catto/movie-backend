import { Injectable } from "@nestjs/common";

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
  provider: "vidsrcme";
  tmdbId: number;
  contentType: StreamContentType;
  url: string;
  fallbackUrls: string[];
}

@Injectable()
export class StreamEmbedService {
  private readonly defaultDomains = [
    "https://vsembed.ru",
    "https://vidsrc-embed.ru",
    "https://vidsrc-embed.su",
    "https://vidsrcme.su",
    "https://vsrc.su",
  ];

  private getEmbedDomains(): string[] {
    return this.defaultDomains;
  }

  private buildEmbedUrl(domain: string, query: StreamUrlQuery): string {
    const embedPath = query.contentType === "movie" ? "/embed/movie" : "/embed/tv";
    const url = new URL(embedPath, domain);

    url.searchParams.set("tmdb", String(query.tmdbId));

    if (query.contentType === "tv") {
      if (query.season) {
        url.searchParams.set("season", String(query.season));
      }
      if (query.episode) {
        url.searchParams.set("episode", String(query.episode));
      }
      if (query.autoNext !== undefined) {
        url.searchParams.set("autonext", query.autoNext ? "1" : "0");
      }
    }

    if (query.dsLang) {
      url.searchParams.set("ds_lang", query.dsLang);
    }

    if (query.autoplay !== undefined) {
      url.searchParams.set("autoplay", query.autoplay ? "1" : "0");
    }

    return url.toString();
  }

  buildStreamUrls(query: StreamUrlQuery): StreamUrlResult {
    const domains = this.getEmbedDomains();
    const urls = domains.map((domain) => this.buildEmbedUrl(domain, query));

    return {
      provider: "vidsrcme",
      tmdbId: query.tmdbId,
      contentType: query.contentType,
      url: urls[0],
      fallbackUrls: urls.slice(1),
    };
  }
}
