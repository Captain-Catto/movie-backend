import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recommendation } from '../entities/recommendation.entity';

/**
 * Repository cho Recommendation entity
 * Quản lý cache recommendations với giới hạn tối đa 1000 records
 */
@Injectable()
export class RecommendationRepository {
  private readonly logger = new Logger(RecommendationRepository.name);
  
  // Cleanup target: giữ lại 1000 recommendations tốt nhất sau khi cleanup
  private readonly CLEANUP_TARGET = 1000;
  
  // Trigger cleanup khi vượt quá số lượng này (100k records)
  private readonly CLEANUP_THRESHOLD = 100000;
  
  // Số recommendations tối đa cho mỗi content
  private readonly MAX_PER_CONTENT = 12;

  constructor(
    @InjectRepository(Recommendation)
    private repository: Repository<Recommendation>
  ) {}

  /**
   * Lấy recommendations đã cache cho content cụ thể
   * @param contentType - 'movie' hoặc 'tv'
   * @param contentId - TMDB ID của content
   * @param limit - Số lượng recommendations cần lấy (default 12)
   * @returns Array recommendations đã cache
   */
  async findRecommendations(
    contentType: string,
    contentId: number,
    limit: number = 12
  ): Promise<Recommendation[]> {
    this.logger.log(`🔍 Finding cached recommendations for ${contentType} ${contentId}`);

    const recommendations = await this.repository.find({
      where: { contentType, contentId },
      order: { score: 'DESC' }, // Sort theo score cao nhất trước
      take: Math.min(limit, this.MAX_PER_CONTENT),
    });

    // Nếu tìm thấy cache, update usage stats (async, không block)
    if (recommendations.length > 0) {
      this.logger.log(`✅ Found ${recommendations.length} cached recommendations for ${contentType} ${contentId}`);
      
      // Update usage stats bất đồng bộ
      setImmediate(() => {
        this.updateUsageStats(contentType, contentId);
      });
    } else {
      this.logger.log(`❌ No cached recommendations found for ${contentType} ${contentId}`);
    }

    return recommendations;
  }

  /**
   * Lưu/Cập nhật recommendations vào cache
   * Tự động kiểm tra giới hạn 1000 records và cleanup nếu cần
   * @param contentType - 'movie' hoặc 'tv'
   * @param contentId - TMDB ID của content gốc
   * @param recommendations - Array recommendations từ TMDB API
   */
  async upsertRecommendations(
    contentType: string,
    contentId: number,
    recommendations: any[]
  ): Promise<void> {
    this.logger.log(`💾 Caching ${recommendations.length} recommendations for ${contentType} ${contentId}`);

    try {
      // 1. Xóa cache cũ của content này (nếu có)
      await this.repository.delete({ contentType, contentId });

      // 2. Tạo entities mới
      const entities = recommendations
        .slice(0, this.MAX_PER_CONTENT) // Giới hạn mỗi content chỉ cache 12 recommendations
        .map((rec, index) => {
          return this.repository.create({
            contentType,
            contentId,
            recommendedContentType: contentType, // Cùng loại (movie->movie, tv->tv)
            recommendedContentId: rec.id,
            recommendedContentData: rec, // Cache toàn bộ data từ TMDB
            score: recommendations.length - index, // Score giảm dần theo thứ tự
            viewCount: 0,
            lastAccessed: null,
            lastSynced: new Date(),
          });
        });

      // 3. Lưu vào database
      await this.repository.save(entities);

      this.logger.log(`✅ Successfully cached ${entities.length} recommendations for ${contentType} ${contentId}`);

      // 4. Không cần auto cleanup ngay - để background job xử lý
      // Chỉ log warning nếu database lớn
      const totalCount = await this.repository.count();
      if (totalCount > this.CLEANUP_THRESHOLD) {
        this.logger.warn(`⚠️ Database has ${totalCount} records, cleanup recommended`);
      }

    } catch (error) {
      this.logger.error(`❌ Failed to cache recommendations for ${contentType} ${contentId}:`, error.message);
      throw error;
    }
  }

  /**
   * Update usage stats khi recommendations được access
   * @param contentType - 'movie' hoặc 'tv'
   * @param contentId - TMDB ID của content
   */
  private async updateUsageStats(contentType: string, contentId: number): Promise<void> {
    try {
      await this.repository
        .createQueryBuilder()
        .update()
        .set({ 
          viewCount: () => 'viewCount + 1',
          lastAccessed: new Date()
        })
        .where({ contentType, contentId })
        .execute();

      this.logger.log(`📈 Updated usage stats for ${contentType} ${contentId}`);
    } catch (error) {
      // Log error nhưng không throw để không ảnh hưởng main flow
      this.logger.warn(`Failed to update usage stats for ${contentType} ${contentId}:`, error.message);
    }
  }

  /**
   * Cleanup database về mức 1000 records tốt nhất
   * CHỈ gọi khi cần cleanup, không tự động chạy
   * Giữ lại những recommendations có usage cao nhất
   */
  async performMajorCleanup(): Promise<{ 
    beforeCount: number; 
    afterCount: number; 
    removedCount: number; 
  }> {
    const beforeCount = await this.repository.count();
    
    if (beforeCount <= this.CLEANUP_TARGET) {
      this.logger.log(`✅ Database (${beforeCount} records) already within target (${this.CLEANUP_TARGET})`);
      return {
        beforeCount,
        afterCount: beforeCount,
        removedCount: 0,
      };
    }

    const excessCount = beforeCount - this.CLEANUP_TARGET;
    
    this.logger.log(`🗑️ Major cleanup: ${beforeCount} → ${this.CLEANUP_TARGET} records (removing ${excessCount})`);

    // Xóa những recommendations có priority thấp nhất
    // Ưu tiên giữ lại: viewCount cao -> lastAccessed mới -> score cao
    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .where(`id IN (
        SELECT id FROM (
          SELECT id 
          FROM recommendations
          ORDER BY 
            viewCount ASC,
            COALESCE(lastAccessed, '1970-01-01') ASC,
            score ASC
          LIMIT :excessCount
        ) AS subquery
      )`, { excessCount })
      .execute();

    const afterCount = await this.repository.count();
    const actualRemoved = result.affected || 0;

    this.logger.log(`✅ Major cleanup completed: ${beforeCount} → ${afterCount} records (removed ${actualRemoved})`);
    
    return {
      beforeCount,
      afterCount,
      removedCount: actualRemoved,
    };
  }

  /**
   * Lấy thống kê cache để monitoring
   * @returns Stats object
   */
  async getCacheStats(): Promise<{
    totalRecords: number;
    byContentType: { contentType: string; count: number }[];
    topAccessed: { contentType: string; contentId: number; viewCount: number }[];
    oldestCache: Date | null;
    cleanupThreshold: number;
    cleanupTarget: number;
    needsCleanup: boolean;
  }> {
    const totalRecords = await this.repository.count();

    // Count by content type
    const byContentType = await this.repository
      .createQueryBuilder('r')
      .select('r.contentType', 'contentType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('r.contentType')
      .getRawMany();

    // Top 10 most accessed
    const topAccessed = await this.repository
      .createQueryBuilder('r')
      .select(['r.contentType', 'r.contentId', 'r.viewCount'])
      .orderBy('r.viewCount', 'DESC')
      .limit(10)
      .getMany();

    // Oldest cache entry
    const oldestEntry = await this.repository
      .createQueryBuilder('r')
      .select('r.createdAt')
      .orderBy('r.createdAt', 'ASC')
      .limit(1)
      .getOne();

    return {
      totalRecords,
      byContentType,
      topAccessed: topAccessed.map(item => ({
        contentType: item.contentType,
        contentId: item.contentId,
        viewCount: item.viewCount,
      })),
      oldestCache: oldestEntry?.createdAt || null,
      cleanupThreshold: this.CLEANUP_THRESHOLD,
      cleanupTarget: this.CLEANUP_TARGET,
      needsCleanup: totalRecords > this.CLEANUP_THRESHOLD,
    };
  }

  /**
   * Cleanup nhẹ - chỉ xóa cache cũ và không sử dụng
   * @param olderThanDays - Xóa cache cũ hơn X ngày
   * @returns Số records đã xóa
   */
  async cleanupOldUnusedCache(olderThanDays: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .andWhere('viewCount = 0') // Chỉ xóa những recommendations chưa từng được xem
      .execute();

    this.logger.log(`🧹 Light cleanup: Removed ${result.affected} old unused recommendations (>${olderThanDays} days, viewCount=0)`);
    
    return result.affected || 0;
  }

  /**
   * Kiểm tra xem có cần major cleanup không
   * @returns true nếu cần cleanup
   */
  async needsMajorCleanup(): Promise<boolean> {
    const totalCount = await this.repository.count();
    return totalCount > this.CLEANUP_THRESHOLD;
  }
}