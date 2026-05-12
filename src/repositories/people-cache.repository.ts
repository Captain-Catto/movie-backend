import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PersonCache } from '../entities/person-cache.entity';
import { PersonCreditsCache } from '../entities/person-credits-cache.entity';

/**
 * Repository cho People cache system
 * Quản lý cache cho cả person details và credits
 * Scaling: 50k+ records trong ngày, cleanup về 10000 records tốt nhất
 */
@Injectable()
export class PeopleCacheRepository {
  private readonly logger = new Logger(PeopleCacheRepository.name);
  
  // Cleanup target: giữ lại 10000 records tốt nhất sau khi cleanup
  private readonly CLEANUP_TARGET = 10000;
  
  // Trigger cleanup khi vượt quá số lượng này (50k records cho people)
  private readonly CLEANUP_THRESHOLD = 50000;

  constructor(
    @InjectRepository(PersonCache)
    private personCacheRepository: Repository<PersonCache>,
    @InjectRepository(PersonCreditsCache)
    private creditsRepository: Repository<PersonCreditsCache>
  ) {}

  /**
   * ===== PERSON DETAILS CACHE =====
   */

  /**
   * Lấy person details đã cache
   * @param tmdbId - TMDB ID của person
   * @returns PersonCache hoặc null nếu không có cache
   */
  async findPersonByTmdbId(tmdbId: number): Promise<PersonCache | null> {
    const person = await this.personCacheRepository.findOne({
      where: { tmdbId }
    });

    if (person) {
      setImmediate(() => {
        this.updatePersonUsageStats(tmdbId);
      });
    }

    return person;
  }

  /**
   * Lưu/Cập nhật person details vào cache
   * @param tmdbId - TMDB ID của person
   * @param personData - Data từ TMDB API
   */
  async upsertPersonCache(tmdbId: number, personData: any): Promise<PersonCache> {

    try {
      // Tìm existing cache
      let person = await this.personCacheRepository.findOne({ where: { tmdbId } });

      const cacheData = {
        tmdbId,
        personData,
        popularity: personData.popularity || 0,
        name: personData.name || 'Unknown',
        knownForDepartment: personData.known_for_department || null,
        lastSynced: new Date(),
      };

      if (person) {
        // Update existing
        await this.personCacheRepository.update(person.id, cacheData);
        person = { ...person, ...cacheData };
      } else {
        // Create new
        person = this.personCacheRepository.create({
          ...cacheData,
          viewCount: 0,
          lastAccessed: null,
        });
        await this.personCacheRepository.save(person);
      }

      // Check và warning nếu database lớn (không auto cleanup)
      const totalCount = await this.personCacheRepository.count();
      if (totalCount > this.CLEANUP_THRESHOLD) {
        this.logger.warn(`⚠️ Person cache has ${totalCount} records, cleanup recommended`);
      }

      return person;
    } catch (error) {
      this.logger.error(`❌ Failed to cache person TMDB ID ${tmdbId}:`, error.message);
      throw error;
    }
  }

  /**
   * ===== PERSON CREDITS CACHE =====
   */

  /**
   * Lấy person credits đã cache
   * @param personTmdbId - TMDB ID của person
   * @returns PersonCreditsCache hoặc null nếu không có cache
   */
  async findCreditsByPersonTmdbId(personTmdbId: number): Promise<PersonCreditsCache | null> {
    const credits = await this.creditsRepository.findOne({
      where: { personTmdbId }
    });

    if (credits) {
      setImmediate(() => {
        this.updateCreditsUsageStats(personTmdbId);
      });
    }

    return credits;
  }

  /**
   * Lưu/Cập nhật person credits vào cache
   * @param personTmdbId - TMDB ID của person
   * @param creditsData - Credits data từ TMDB API
   */
  async upsertCreditsCache(personTmdbId: number, creditsData: any): Promise<PersonCreditsCache> {

    try {
      // Xử lý metadata từ credits
      const metadata = this.extractCreditsMetadata(creditsData);
      
      // Tìm existing cache
      let credits = await this.creditsRepository.findOne({ where: { personTmdbId } });

      const cacheData = {
        personTmdbId,
        creditsData,
        creditsMetadata: metadata,
        totalCreditsCount: metadata.totalCredits,
        latestReleaseDate: metadata.latestReleaseDate ? new Date(metadata.latestReleaseDate) : null,
        lastSynced: new Date(),
      };

      if (credits) {
        // Update existing
        await this.creditsRepository.update(credits.id, cacheData);
        credits = { ...credits, ...cacheData };
      } else {
        // Create new
        credits = this.creditsRepository.create({
          ...cacheData,
          viewCount: 0,
          lastAccessed: null,
        });
        await this.creditsRepository.save(credits);
      }

      return credits;
    } catch (error) {
      this.logger.error(`❌ Failed to cache credits for person TMDB ID ${personTmdbId}:`, error.message);
      throw error;
    }
  }

  /**
   * ===== USAGE STATS =====
   */

  /**
   * Update usage stats cho person cache
   */
  private async updatePersonUsageStats(tmdbId: number): Promise<void> {
    try {
      await this.personCacheRepository
        .createQueryBuilder()
        .update()
        .set({ 
          viewCount: () => 'viewCount + 1',
          lastAccessed: new Date()
        })
        .where({ tmdbId })
        .execute();

    } catch (error) {
      this.logger.warn(`Failed to update person usage stats for ${tmdbId}:`, error.message);
    }
  }

  /**
   * Update usage stats cho credits cache
   */
  private async updateCreditsUsageStats(personTmdbId: number): Promise<void> {
    try {
      await this.creditsRepository
        .createQueryBuilder()
        .update()
        .set({ 
          viewCount: () => 'viewCount + 1',
          lastAccessed: new Date()
        })
        .where({ personTmdbId })
        .execute();

    } catch (error) {
      this.logger.warn(`Failed to update credits usage stats for ${personTmdbId}:`, error.message);
    }
  }

  /**
   * ===== METADATA PROCESSING =====
   */

  /**
   * Trích xuất metadata từ credits data để sorting và filtering
   */
  private extractCreditsMetadata(creditsData: any): any {
    const cast = creditsData.cast || [];
    const crew = creditsData.crew || [];
    const allCredits = [...cast, ...crew];

    // Tìm release date mới nhất
    const dates = allCredits
      .map(credit => credit.release_date || credit.first_air_date)
      .filter(Boolean)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    // Đếm media types
    const mediaTypes = allCredits.reduce((acc, credit) => {
      const type = credit.media_type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // Unique departments
    const departments = [...new Set(
      crew.map(c => c.department).filter(Boolean)
    )];

    return {
      totalCredits: allCredits.length,
      latestReleaseDate: dates[0] || null,
      departments,
      mediaTypes,
      castCount: cast.length,
      crewCount: crew.length,
    };
  }

  /**
   * ===== CLEANUP METHODS =====
   */

  /**
   * Cleanup nhẹ - xóa cache cũ và không sử dụng
   * @param olderThanDays - Xóa cache cũ hơn X ngày
   * @returns Số records đã xóa
   */
  async cleanupOldUnusedCache(olderThanDays: number = 7): Promise<{
    personCacheRemoved: number;
    creditsCacheRemoved: number;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const personResult = await this.personCacheRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .andWhere('viewCount = 0')
      .execute();

    const creditsResult = await this.creditsRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .andWhere('viewCount = 0')
      .execute();

    const personRemoved = personResult.affected || 0;
    const creditsRemoved = creditsResult.affected || 0;

    this.logger.log(`🧹 Light cleanup: Removed ${personRemoved} person cache, ${creditsRemoved} credits cache (>${olderThanDays} days, viewCount=0)`);
    
    return {
      personCacheRemoved: personRemoved,
      creditsCacheRemoved: creditsRemoved,
    };
  }

  /**
   * Major cleanup - giữ lại 10000 records tốt nhất cho mỗi type
   */
  async performMajorCleanup(targetLimit: number = this.CLEANUP_TARGET): Promise<{
    personCache: { beforeCount: number; afterCount: number; removedCount: number };
    creditsCache: { beforeCount: number; afterCount: number; removedCount: number };
  }> {
    const normalizedTarget = Math.max(0, Math.floor(targetLimit));
    this.logger.log(`💪 Performing major cleanup for people cache to ${normalizedTarget} records...`);

    const personCleanup = await this.majorCleanupPersonCache(normalizedTarget);
    const creditsCleanup = await this.majorCleanupCreditsCache(normalizedTarget);

    return {
      personCache: personCleanup,
      creditsCache: creditsCleanup,
    };
  }

  private async majorCleanupPersonCache(targetLimit: number): Promise<{ beforeCount: number; afterCount: number; removedCount: number }> {
    const beforeCount = await this.personCacheRepository.count();
    
    if (beforeCount <= targetLimit) {
      return { beforeCount, afterCount: beforeCount, removedCount: 0 };
    }

    const excessCount = beforeCount - targetLimit;

    const result = await this.personCacheRepository
      .createQueryBuilder()
      .delete()
      .where(`id IN (
        SELECT id FROM (
          SELECT id 
          FROM person_cache
          ORDER BY 
            viewCount ASC,
            COALESCE(lastAccessed, '1970-01-01') ASC,
            popularity ASC
          LIMIT :excessCount
        ) AS subquery
      )`, { excessCount })
      .execute();

    const afterCount = await this.personCacheRepository.count();
    
    return {
      beforeCount,
      afterCount,
      removedCount: result.affected || 0,
    };
  }

  private async majorCleanupCreditsCache(targetLimit: number): Promise<{ beforeCount: number; afterCount: number; removedCount: number }> {
    const beforeCount = await this.creditsRepository.count();
    
    if (beforeCount <= targetLimit) {
      return { beforeCount, afterCount: beforeCount, removedCount: 0 };
    }

    const excessCount = beforeCount - targetLimit;

    const result = await this.creditsRepository
      .createQueryBuilder()
      .delete()
      .where(`id IN (
        SELECT id FROM (
          SELECT id 
          FROM person_credits_cache
          ORDER BY 
            viewCount ASC,
            COALESCE(lastAccessed, '1970-01-01') ASC,
            totalCreditsCount ASC
          LIMIT :excessCount
        ) AS subquery
      )`, { excessCount })
      .execute();

    const afterCount = await this.creditsRepository.count();
    
    return {
      beforeCount,
      afterCount,
      removedCount: result.affected || 0,
    };
  }

  /**
   * Kiểm tra xem có cần major cleanup không
   */
  async needsMajorCleanup(): Promise<boolean> {
    const personCount = await this.personCacheRepository.count();
    const creditsCount = await this.creditsRepository.count();
    
    return personCount > this.CLEANUP_THRESHOLD || creditsCount > this.CLEANUP_THRESHOLD;
  }

  /**
   * Lấy thống kê cache để monitoring
   */
  async getCacheStats(): Promise<any> {
    const [personCount, creditsCount] = await Promise.all([
      this.personCacheRepository.count(),
      this.creditsRepository.count(),
    ]);

    const [topPersons, topCredits] = await Promise.all([
      this.personCacheRepository
        .createQueryBuilder('p')
        .select(['p.tmdbId', 'p.name', 'p.viewCount'])
        .orderBy('p.viewCount', 'DESC')
        .limit(10)
        .getMany(),
        
      this.creditsRepository
        .createQueryBuilder('c')
        .select(['c.personTmdbId', 'c.totalCreditsCount', 'c.viewCount'])
        .orderBy('c.viewCount', 'DESC')
        .limit(10)
        .getMany()
    ]);

    return {
      personCache: {
        totalRecords: personCount,
        cleanupThreshold: this.CLEANUP_THRESHOLD,
        cleanupTarget: this.CLEANUP_TARGET,
        needsCleanup: personCount > this.CLEANUP_THRESHOLD,
      },
      creditsCache: {
        totalRecords: creditsCount,
        cleanupThreshold: this.CLEANUP_THRESHOLD,
        cleanupTarget: this.CLEANUP_TARGET,
        needsCleanup: creditsCount > this.CLEANUP_THRESHOLD,
      },
      topAccessedPersons: topPersons,
      topAccessedCredits: topCredits,
      overallHealthStatus: (personCount > this.CLEANUP_THRESHOLD || creditsCount > this.CLEANUP_THRESHOLD) 
        ? 'warning' : 'healthy',
    };
  }
}
