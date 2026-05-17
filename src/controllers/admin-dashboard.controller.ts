import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { AdminDashboardService } from "../services/admin-dashboard.service";
import { ApiResponse } from "../interfaces/api.interface";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";
import { Roles } from "../decorators/roles.decorator";
import { UserRole } from "../entities/user.entity";
import { ViewerReadOnlyInterceptor } from "../interceptors/viewer-read-only.interceptor";
import { ApiQuery, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ApiStandardErrors, ApiSuccess } from "../swagger/api-response.decorators";

@ApiTags('Admin - Dashboard')
@ApiBearerAuth('JWT')
@Controller("admin/dashboard")
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ViewerReadOnlyInterceptor)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.VIEWER)
export class AdminDashboardController {
  constructor(private adminDashboardService: AdminDashboardService) {}

  @Get("stats")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({
    summary: "Get admin dashboard overview statistics",
    dataType: "Dashboard statistics",
  })
  @ApiStandardErrors({ unauthorized: true, forbidden: true })
  async getStats(): Promise<ApiResponse> {
    console.log("📊 [ADMIN-DASHBOARD] getStats endpoint called");
    try {
      const stats = await this.adminDashboardService.getDashboardStats();

      console.log("✅ [ADMIN-DASHBOARD] Stats retrieved successfully");
      return {
        success: true,
        message: "Dashboard stats retrieved successfully",
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve dashboard stats",
        error: error.message,
      };
    }
  }

  @Get("user-growth")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({
    summary: "Get user growth chart data",
    dataType: "User growth time series",
  })
  @ApiQuery({ name: "days", required: false, type: Number, example: 30 })
  @ApiStandardErrors({ unauthorized: true, forbidden: true })
  async getUserGrowth(@Query("days") days: number = 30): Promise<ApiResponse> {
    try {
      const data = await this.adminDashboardService.getUserGrowthData(
        Number(days)
      );

      return {
        success: true,
        message: "User growth data retrieved successfully",
        data,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve user growth data",
        error: error.message,
      };
    }
  }

  @Get("content-by-month")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({
    summary: "Get content creation counts by month",
    dataType: "Content by month time series",
  })
  @ApiQuery({ name: "months", required: false, type: Number, example: 6 })
  @ApiStandardErrors({ unauthorized: true, forbidden: true })
  async getContentByMonth(
    @Query("months") months: number = 6
  ): Promise<ApiResponse> {
    try {
      const data = await this.adminDashboardService.getContentByMonth(
        Number(months)
      );

      return {
        success: true,
        message: "Content by month data retrieved successfully",
        data,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve content by month data",
        error: error.message,
      };
    }
  }
}
