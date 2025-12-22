import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
} from "@nestjs/common";
import { AnalyticsService } from "../services/analytics.service";
import { Request } from "express";
import * as geoip from "geoip-lite";

interface TrackEventDto {
  contentId: string;
  contentType: "movie" | "tv_series";
  actionType: "VIEW" | "CLICK" | "PLAY" | "COMPLETE";
  contentTitle?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

@Controller("analytics")
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Post("track")
  @HttpCode(HttpStatus.OK)
  async trackEvent(@Body() dto: TrackEventDto, @Req() req: Request) {
    try {
      console.log("[Analytics Controller] Received tracking request:", dto);

      // Extract user info from request
      const userId = (req.user as any)?.id || null;
      const ipAddress = this.resolveIp(req);
      const userAgent = req.headers["user-agent"] || null;
      const country = this.resolveCountry(req, ipAddress);

      console.log("[Analytics Controller] Request info:", {
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

      console.log("[Analytics Controller] Event tracked successfully");

      return {
        success: true,
        message: "Event tracked successfully",
      };
    } catch (error) {
      console.error("[Analytics Controller] Error tracking event:", error);
      console.error("[Analytics Controller] Error details:", {
        message: error.message,
        stack: error.stack,
      });
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
    // Strip IPv6 prefix if present (e.g., ::ffff:1.2.3.4)
    if (ip.startsWith("::ffff:")) {
      return ip.replace("::ffff:", "");
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
