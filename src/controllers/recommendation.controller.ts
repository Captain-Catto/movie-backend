import {
  Controller,
  Get,
  Post,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { RecommendationCleanupService } from '../services/recommendation-cleanup.service';
import { ApiResponse } from '../interfaces/api.interface';

/**
 * Controller để monitor và quản lý recommendation cache
 * Các endpoint admin để theo dõi và maintain cache system
 */
@Controller('recommendations')
export class RecommendationController {
  constructor(
    private recommendationCleanupService: RecommendationCleanupService
  ) {}

  /**
   * Lấy thống kê cache hiện tại
   * GET /api/recommendations/stats
   */
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async getCacheStats(): Promise<ApiResponse> {
    try {
      const stats = await this.recommendationCleanupService.getCacheStats();
      
      return {
        success: true,
        message: 'Cache stats retrieved successfully',
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve cache stats',
        error: error.message,
      };
    }
  }

  /**
   * Thực hiện manual cleanup cache
   * POST /api/recommendations/cleanup
   * Chỉ dùng khi cần cleanup khẩn cấp
   */
  @Post('cleanup')
  @HttpCode(HttpStatus.OK)
  async performManualCleanup(): Promise<ApiResponse> {
    try {
      const result = await this.recommendationCleanupService.performManualCleanup();
      
      return {
        success: true,
        message: 'Manual cleanup completed successfully',
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Manual cleanup failed',
        error: error.message,
      };
    }
  }

  /**
   * EMERGENCY: Clear toàn bộ cache
   * POST /api/recommendations/clear-all
   * CHỈ SỬ DỤNG KHI THẬT SỰ CẦN THIẾT!
   */
  @Post('clear-all')
  @HttpCode(HttpStatus.OK)
  async clearAllCache(): Promise<ApiResponse> {
    try {
      const result = await this.recommendationCleanupService.clearAllCache();
      
      return {
        success: true,
        message: 'All recommendation cache cleared',
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to clear cache',
        error: error.message,
      };
    }
  }

  /**
   * Force major cleanup - giữ lại 1000 records tốt nhất
   * POST /api/recommendations/major-cleanup
   * Dùng khi database quá lớn và cần giảm xuống 1000 records
   */
  @Post('major-cleanup')
  @HttpCode(HttpStatus.OK)
  async performMajorCleanup(): Promise<ApiResponse> {
    try {
      const result = await this.recommendationCleanupService['recommendationRepository'].performMajorCleanup();
      
      return {
        success: true,
        message: 'Major cleanup completed successfully',
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Major cleanup failed',
        error: error.message,
      };
    }
  }
}