import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  ViewAnalytics,
  ActionType,
  ContentType as ViewContentType,
  Movie,
  TVSeries,
} from "../entities";
import { AdminAnalyticsRealtimeService } from "./admin-analytics-realtime.service";
const UAParser = require("ua-parser-js");

interface TrackEventParams {
  contentId: string;
  contentType: "movie" | "tv_series";
  actionType:
    | "VIEW"
    | "CLICK"
    | "PLAY"
    | "COMPLETE"
    | "SEARCH"
    | "view"
    | "click"
    | "play"
    | "complete"
    | "search";
  contentTitle?: string;
  duration?: number;
  metadata?: Record<string, any>;
  userId?: number;
  ipAddress?: string;
  userAgent?: string;
  country?: string | null;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(ViewAnalytics)
    private viewAnalyticsRepository: Repository<ViewAnalytics>,
    @InjectRepository(Movie)
    private movieRepository: Repository<Movie>,
    @InjectRepository(TVSeries)
    private tvRepository: Repository<TVSeries>,
    private readonly realtimeService: AdminAnalyticsRealtimeService
  ) {}

  /**
   * Track an analytics event
   */
  async trackEvent(params: TrackEventParams): Promise<void> {
    try {
      const {
        contentId,
        contentType,
        actionType,
        contentTitle,
        duration,
        metadata,
        userId,
        ipAddress,
        userAgent,
      } = params;
      const normalizedActionType = this.normalizeActionType(actionType);
      const normalizedContentId = this.normalizeContentId(contentId);

      // Parse user agent for device info
      const deviceInfo = this.parseUserAgent(userAgent);

      // Map content type
      const mappedContentType =
        contentType === "tv_series"
          ? ViewContentType.TV_SERIES
          : ViewContentType.MOVIE;

      // Create analytics record
      const analytics = this.viewAnalyticsRepository.create({
        contentId: normalizedContentId,
        contentType: mappedContentType,
        actionType: normalizedActionType,
        contentTitle,
        duration,
        userId,
        ipAddress,
        userAgent,
        deviceType: deviceInfo.device,
        country: params.country || null,
        metadata: metadata || {},
      });

      await this.viewAnalyticsRepository.save(analytics);

      // Update content counters asynchronously (don't block response)
      this.updateContentCounters(
        normalizedContentId,
        contentType,
        normalizedActionType
      ).catch((error) => {
        this.logger.error("Error updating content counters:", error);
      });

      // Push lightweight realtime snapshot updates for admin dashboard
      this.realtimeService
        .trackAction(normalizedActionType)
        .catch(() => undefined);
    } catch (error) {
      this.logger.error("Error tracking event:", error);
      throw error;
    }
  }

  /**
   * Update view/click counters on content
   */
  private async updateContentCounters(
    contentId: string,
    contentType: string,
    actionType: string
  ): Promise<void> {
    try {
      const tmdbId = parseInt(contentId);
      if (isNaN(tmdbId)) return;

      if (contentType === "movie") {
        const movie = await this.movieRepository.findOne({
          where: { tmdbId },
        });
        if (movie) {
          if (actionType === ActionType.VIEW) {
            movie.viewCount = (movie.viewCount || 0) + 1;
          } else if (actionType === ActionType.CLICK) {
            movie.clickCount = (movie.clickCount || 0) + 1;
          }
          await this.movieRepository.save(movie);
        }
      } else if (contentType === "tv_series") {
        const tv = await this.tvRepository.findOne({ where: { tmdbId } });
        if (tv) {
          if (actionType === ActionType.VIEW) {
            tv.viewCount = (tv.viewCount || 0) + 1;
          } else if (actionType === ActionType.CLICK) {
            tv.clickCount = (tv.clickCount || 0) + 1;
          }
          await this.tvRepository.save(tv);
        }
      }
    } catch (error) {
      this.logger.error("Error updating content counters:", error);
    }
  }

  /**
   * Parse user agent to extract device type
   */
  private parseUserAgent(userAgent?: string): { device: string } {
    if (!userAgent) {
      return { device: "unknown" };
    }

    try {
      const parser = UAParser(userAgent);
      const device = parser.device;

      if (device.type === "mobile") {
        return { device: "mobile" };
      } else if (device.type === "tablet") {
        return { device: "tablet" };
      } else {
        return { device: "desktop" };
      }
    } catch (error) {
      return { device: "unknown" };
    }
  }

  private normalizeContentId(contentId: string): string {
    return contentId.replace(/^(movie|tv)-/i, "");
  }

  private normalizeActionType(actionType: TrackEventParams["actionType"]): ActionType {
    const normalized = String(actionType || "").toLowerCase();

    if (normalized === ActionType.CLICK) return ActionType.CLICK;
    if (normalized === ActionType.PLAY) return ActionType.PLAY;
    if (normalized === ActionType.COMPLETE) return ActionType.COMPLETE;
    if (normalized === ActionType.SEARCH) return ActionType.SEARCH;
    return ActionType.VIEW;
  }
}
