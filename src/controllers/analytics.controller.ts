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
import geoip from "geoip-lite";

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
    const forwarded = req.headers["x-forwarded-for"];
    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return forwarded[0];
    }
    if (typeof forwarded === "string") {
      return forwarded.split(",")[0].trim();
    }
    return req.ip || null;
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
}
