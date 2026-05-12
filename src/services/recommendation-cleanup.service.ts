import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RecommendationRepository } from '../repositories/recommendation.repository';
import { SyncSettingsService } from './sync-settings.service';

/**
 * Service đơn giản để cleanup recommendations cache
 * Chạy hàng ngày vào 3h sáng để dọn dẹp cache cũ
 * Giữ tối đa 1000 records như yêu cầu của dự án nhỏ
 */
@Injectable()
export class RecommendationCleanupService {
  private readonly logger = new Logger(RecommendationCleanupService.name);

  constructor(
    private recommendationRepository: RecommendationRepository,
    private syncSettingsService: SyncSettingsService
  ) {}

  /**
   * Chạy cleanup hàng ngày lúc 3h sáng
   * - Light cleanup: xóa cache cũ không dùng
   * - Major cleanup: nếu > 100k records thì giữ lại 1000 records tốt nhất
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async dailyCleanup() {
    try {
      this.logger.log('🧹 Starting daily recommendations cleanup...');

      // Lấy thống kê hiện tại
      const stats = await this.recommendationRepository.getCacheStats();
      const { recommendationCacheLimit } =
        await this.syncSettingsService.getCatalogLimits();
      
      this.logger.log(`📊 Current cache stats:`, {
        totalRecords: stats.totalRecords,
        byContentType: stats.byContentType,
        recommendationCacheLimit,
        needsCleanup: stats.needsCleanup,
      });

      // 1. Light cleanup - xóa cache cũ không dùng trước
      const removedOldCount = await this.recommendationRepository.cleanupOldUnusedCache(7);
      
      if (removedOldCount > 0) {
        this.logger.log(`🧹 Light cleanup: Removed ${removedOldCount} old unused recommendations`);
      }

      // 2. Major cleanup nếu vượt giới hạn cấu hình
      const updatedStats = await this.recommendationRepository.getCacheStats();
      
      if (
        recommendationCacheLimit > 0 &&
        updatedStats.totalRecords > recommendationCacheLimit
      ) {
        this.logger.log(`⚠️ Database size (${updatedStats.totalRecords}) exceeds configured limit (${recommendationCacheLimit})`);
        this.logger.log(`💪 Performing MAJOR cleanup to ${recommendationCacheLimit} records...`);
        
        const majorCleanupResult = await this.recommendationRepository.performMajorCleanup(
          recommendationCacheLimit
        );
        
        this.logger.log(`✅ Major cleanup completed:`, {
          before: majorCleanupResult.beforeCount,
          after: majorCleanupResult.afterCount,
          removed: majorCleanupResult.removedCount,
        });
      } else {
        this.logger.log(`✅ Database size (${updatedStats.totalRecords}) is within configured limit, no major cleanup needed`);
      }

    } catch (error) {
      this.logger.error('❌ Daily cleanup failed:', error.message);
    }
  }

  /**
   * Kiểm tra xem có cần major cleanup không
   */
  private async shouldPerformMajorCleanup(): Promise<boolean> {
    return await this.recommendationRepository.needsMajorCleanup();
  }

  /**
   * Manual cleanup method - có thể gọi từ admin endpoint
   * Thực hiện cả light và major cleanup nếu cần
   * @returns Stats trước và sau cleanup
   */
  async performManualCleanup(): Promise<{
    before: any;
    after: any;
    lightCleanup: { removedCount: number };
    majorCleanup: { performed: boolean; result?: any };
  }> {
    this.logger.log('🔧 Performing manual cleanup...');

    const statsBefore = await this.recommendationRepository.getCacheStats();
    const { recommendationCacheLimit } =
      await this.syncSettingsService.getCatalogLimits();
    
    // 1. Light cleanup - xóa cache cũ không sử dụng
    const removedOldCount = await this.recommendationRepository.cleanupOldUnusedCache(3); // Xóa cũ hơn 3 ngày
    
    // 2. Major cleanup nếu cần
    let majorCleanupResult: { performed: boolean; result?: any } = { performed: false };
    
    const needsMajor =
      recommendationCacheLimit > 0 &&
      statsBefore.totalRecords > recommendationCacheLimit;
    
    if (needsMajor) {
      this.logger.log('💪 Performing major cleanup...');
      const result = await this.recommendationRepository.performMajorCleanup(
        recommendationCacheLimit
      );
      majorCleanupResult = { performed: true, result };
    } else {
      this.logger.log('✅ No major cleanup needed');
    }
    
    const statsAfter = await this.recommendationRepository.getCacheStats();

    this.logger.log(`✅ Manual cleanup completed:`, {
      beforeCount: statsBefore.totalRecords,
      afterCount: statsAfter.totalRecords,
      lightRemoved: removedOldCount,
      majorPerformed: majorCleanupResult.performed,
    });

    return {
      before: statsBefore,
      after: statsAfter,
      lightCleanup: { removedCount: removedOldCount },
      majorCleanup: majorCleanupResult,
    };
  }

  /**
   * Lấy thống kê cache cho monitoring
   */
  async getCacheStats(): Promise<any> {
    const stats = await this.recommendationRepository.getCacheStats();
    
    return {
      ...stats,
      healthStatus: stats.needsCleanup ? 'warning' : 'healthy',
      nextScheduledCleanup: '03:00 AM daily',
      systemLimits: {
        cleanupThreshold: stats.cleanupThreshold,
        cleanupTarget: stats.cleanupTarget,
        currentSize: stats.totalRecords,
        utilizationPercent: (stats.totalRecords / stats.cleanupThreshold * 100).toFixed(2) + '%',
      },
    };
  }

  /**
   * Clear toàn bộ cache (emergency use only)
   */
  async clearAllCache(): Promise<{ removedCount: number }> {
    this.logger.warn('🚨 EMERGENCY: Clearing ALL recommendation cache...');
    
    const statsBefore = await this.recommendationRepository.getCacheStats();
    
    await this.recommendationRepository['repository'].clear();
    
    this.logger.warn(`🗑️ Cleared all ${statsBefore.totalRecords} recommendation records`);
    
    return { removedCount: statsBefore.totalRecords };
  }
}
