import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { AdminAnalyticsService } from "../services/admin-analytics.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";
import { Roles } from "../decorators/roles.decorator";
import { UserRole } from "../entities/user.entity";
import { ApiResponse } from "../interfaces/api.interface";
import { ContentType } from "../entities";

@Controller("admin/analytics")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminAnalyticsController {
  constructor(private adminAnalyticsService: AdminAnalyticsService) {}

  @Get("overview")
  @HttpCode(HttpStatus.OK)
  async getOverview(): Promise<ApiResponse> {
    try {
      const data = await this.adminAnalyticsService.getAnalyticsOverview();

      return {
        success: true,
        message: "Analytics overview retrieved successfully",
        data,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve analytics overview",
        error: error.message,
      };
    }
  }

  @Get("views")
  @HttpCode(HttpStatus.OK)
  async getViewStats(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("contentType") contentType?: string
  ): Promise<ApiResponse> {
    try {
      const query: any = {};
      if (startDate) query.startDate = startDate; // Keep as string for proper timezone handling
      if (endDate) query.endDate = endDate;

      // Map contentType to match ViewAnalytics enum
      if (contentType) {
        if (contentType === "tv" || contentType === "tv_series") {
          query.contentType = ContentType.TV_SERIES;
        } else if (contentType === "movie") {
          query.contentType = ContentType.MOVIE;
        }
      }

      const data = await this.adminAnalyticsService.getViewStats(query);

      return {
        success: true,
        message: "View statistics retrieved successfully",
        data,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve view statistics",
        error: error.message,
      };
    }
  }

  @Get("most-viewed")
  @HttpCode(HttpStatus.OK)
  async getMostViewed(
    @Query("limit") limit?: number,
    @Query("contentType") contentType?: string
  ): Promise<ApiResponse> {
    try {
      // Map contentType to match ViewAnalytics enum
      let mappedContentType: ContentType | undefined;
      if (contentType) {
        if (contentType === "tv" || contentType === "tv_series") {
          mappedContentType = ContentType.TV_SERIES;
        } else if (contentType === "movie") {
          mappedContentType = ContentType.MOVIE;
        }
      }

      const data = await this.adminAnalyticsService.getMostViewedContent(
        limit ? Number(limit) : 20,
        mappedContentType
      );

      return {
        success: true,
        message: "Most viewed content retrieved successfully",
        data,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve most viewed content",
        error: error.message,
      };
    }
  }

  @Get("clicks")
  @HttpCode(HttpStatus.OK)
  async getClickStats(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("contentType") contentType?: string
  ): Promise<ApiResponse> {
    try {
      const query: any = {};
      if (startDate) query.startDate = startDate; // Keep as string for proper timezone handling
      if (endDate) query.endDate = endDate;

      // Map contentType to match ViewAnalytics enum
      if (contentType) {
        if (contentType === "tv" || contentType === "tv_series") {
          query.contentType = ContentType.TV_SERIES;
        } else if (contentType === "movie") {
          query.contentType = ContentType.MOVIE;
        }
      }

      const data = await this.adminAnalyticsService.getClickStats(query);

      return {
        success: true,
        message: "Click statistics retrieved successfully",
        data,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve click statistics",
        error: error.message,
      };
    }
  }

  @Get("plays")
  @HttpCode(HttpStatus.OK)
  async getPlayStats(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("contentType") contentType?: string
  ): Promise<ApiResponse> {
    try {
      const query: any = {};
      if (startDate) query.startDate = startDate; // Keep as string for proper timezone handling
      if (endDate) query.endDate = endDate;

      // Map contentType to match ViewAnalytics enum
      if (contentType) {
        if (contentType === "tv" || contentType === "tv_series") {
          query.contentType = ContentType.TV_SERIES;
        } else if (contentType === "movie") {
          query.contentType = ContentType.MOVIE;
        }
      }

      const data = await this.adminAnalyticsService.getPlayStats(query);

      return {
        success: true,
        message: "Play statistics retrieved successfully",
        data,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve play statistics",
        error: error.message,
      };
    }
  }

  @Get("favorites")
  @HttpCode(HttpStatus.OK)
  async getFavoriteStats(
    @Query("contentType") contentType?: string
  ): Promise<ApiResponse> {
    try {
      let mappedContentType: ContentType | undefined;
      if (contentType) {
        if (contentType === "tv" || contentType === "tv_series") {
          mappedContentType = ContentType.TV_SERIES;
        } else if (contentType === "movie") {
          mappedContentType = ContentType.MOVIE;
        }
      }

      const data = await this.adminAnalyticsService.getFavoriteStats(
        mappedContentType
      );

      return {
        success: true,
        message: "Favorite statistics retrieved successfully",
        data,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve favorite statistics",
        error: error.message,
      };
    }
  }

  @Get("popular")
  @HttpCode(HttpStatus.OK)
  async getPopularContent(
    @Query("limit") limit?: number
  ): Promise<ApiResponse> {
    try {
      const data = await this.adminAnalyticsService.getPopularContent(
        limit ? Number(limit) : 20
      );

      return {
        success: true,
        message: "Popular content retrieved successfully",
        data,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve popular content",
        error: error.message,
      };
    }
  }

  @Get("devices")
  @HttpCode(HttpStatus.OK)
  async getDeviceStats(): Promise<ApiResponse> {
    try {
      const data = await this.adminAnalyticsService.getDeviceStats();

      return {
        success: true,
        message: "Device statistics retrieved successfully",
        data,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve device statistics",
        error: error.message,
      };
    }
  }

  @Get("countries")
  @HttpCode(HttpStatus.OK)
  async getCountryStats(): Promise<ApiResponse> {
    try {
      const data = await this.adminAnalyticsService.getCountryStats();

      return {
        success: true,
        message: "Country statistics retrieved successfully",
        data,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve country statistics",
        error: error.message,
      };
    }
  }
}
