import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
  Logger,
} from "@nestjs/common";
import { AnalyticsService } from "../services/analytics.service";
import { Request } from "express";
import * as geoip from "geoip-lite";
import { ApiBody, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { ApiStandardErrors, ApiSuccess } from "../swagger/api-response.decorators";
import { OptionalJwtAuthGuard } from "../auth/optional-jwt-auth.guard";
import { IsIn, IsNumber, IsObject, IsOptional, IsString } from "class-validator";

class TrackEventDto {
  @ApiProperty({ example: "1226863" })
  @IsString()
  contentId: string;

  @ApiProperty({ enum: ["movie", "tv_series"], example: "movie" })
  @IsIn(["movie", "tv_series"])
  contentType: "movie" | "tv_series";

  @ApiProperty({
    enum: ["view", "click", "play", "complete", "search"],
    example: "view",
  })
  @IsIn(["VIEW", "CLICK", "PLAY", "COMPLETE", "SEARCH", "view", "click", "play", "complete", "search"])
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

  @ApiPropertyOptional({ example: "Five Nights at Freddy's 2" })
  @IsOptional()
  @IsString()
  contentTitle?: string;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional({ example: { source: "hero" } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

@ApiTags('Analytics')
@Controller("analytics")
@UseGuards(OptionalJwtAuthGuard)
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private analyticsService: AnalyticsService) {}

  @Post("track")
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: TrackEventDto })
  @ApiSuccess({
    summary: "Track a client analytics event",
    dataType: "Tracking acknowledgement",
  })
  @ApiStandardErrors()
  async trackEvent(@Body() dto: TrackEventDto, @Req() req: Request) {
    try {
      // Extract user info from request
      const userId = (req.user as any)?.id || null;
      const ipAddress = this.resolveIp(req);
      const userAgent = req.headers["user-agent"] || null;
      const country = this.resolveCountry(req, ipAddress);

      this.logger.debug("Tracking analytics event", {
        contentId: dto.contentId,
        contentType: dto.contentType,
        actionType: dto.actionType,
        duration: dto.duration,
        userId,
        ipAddress,
        userAgent: userAgent ? "present" : "missing",
        country,
      });

      await this.analyticsService.trackEvent({
        ...dto,
        userId,
        ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
        userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
        country,
      });

      return {
        success: true,
        message: "Event tracked successfully",
      };
    } catch (error) {
      this.logger.error("Failed to track analytics event", error?.stack || error?.message);
      return {
        success: false,
        message: "Failed to track event",
        error: error.message,
      };
    }
  }

  private resolveIp(req: Request): string | null {
    const cfIp = req.headers["cf-connecting-ip"] as string | undefined;
    const trueClientIp = req.headers["true-client-ip"] as string | undefined;
    const forwarded = req.headers["x-forwarded-for"];
    const realIp = req.headers["x-real-ip"] as string | undefined;

    if (cfIp) return this.normalizeIp(cfIp);
    if (trueClientIp) return this.normalizeIp(trueClientIp);
    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return this.normalizeIp(forwarded[0]);
    }
    if (typeof forwarded === "string") {
      return this.normalizeIp(forwarded.split(",")[0].trim());
    }
    if (realIp) return this.normalizeIp(realIp);
    return this.normalizeIp(req.ip || null);
  }

  private resolveCountry(req: Request, ip?: string | null): string | null {
    const headerCountry =
      (req.headers["cf-ipcountry"] as string) ||
      (req.headers["x-vercel-ip-country"] as string) ||
      null;
    if (headerCountry && headerCountry.length === 2) {
      return headerCountry.toUpperCase();
    }

    const lookupIp = ip || this.resolveIp(req);
    if (!lookupIp) return null;

    try {
      const geo = geoip.lookup(lookupIp);
      return geo?.country || null;
    } catch {
      return null;
    }
  }

  private normalizeIp(ip?: string | null): string | null {
    if (!ip) return null;
    ip = ip.trim();
    // Strip IPv6 prefix if present (e.g., ::ffff:1.2.3.4)
    if (ip.startsWith("::ffff:")) {
      return ip.replace("::ffff:", "");
    }
    // Strip port if appended (e.g., 1.2.3.4:5678)
    if (ip.includes(":") && ip.includes(".")) {
      return ip.split(":")[0];
    }
    // Ignore local/private ranges for geo lookup
    if (
      ip === "::1" ||
      ip === "127.0.0.1" ||
      ip.startsWith("10.") ||
      ip.startsWith("192.168.") ||
      ip.startsWith("172.16.") ||
      ip.startsWith("172.17.") ||
      ip.startsWith("172.18.") ||
      ip.startsWith("172.19.") ||
      ip.startsWith("172.20.") ||
      ip.startsWith("172.21.") ||
      ip.startsWith("172.22.") ||
      ip.startsWith("172.23.") ||
      ip.startsWith("172.24.") ||
      ip.startsWith("172.25.") ||
      ip.startsWith("172.26.") ||
      ip.startsWith("172.27.") ||
      ip.startsWith("172.28.") ||
      ip.startsWith("172.29.") ||
      ip.startsWith("172.30.") ||
      ip.startsWith("172.31.")
    ) {
      return null;
    }
    return ip;
  }
}
