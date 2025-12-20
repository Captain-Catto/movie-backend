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
      const ipAddress = req.ip || req.headers["x-forwarded-for"] || null;
      const userAgent = req.headers["user-agent"] || null;

      console.log("[Analytics Controller] Request info:", {
        userId,
        ipAddress,
        userAgent: userAgent ? "present" : "missing",
      });

      await this.analyticsService.trackEvent({
        ...dto,
        userId,
        ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
        userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
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
}
