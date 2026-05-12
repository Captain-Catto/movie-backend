import { Injectable, Logger } from '@nestjs/common';
import { PeopleCacheRepository } from '../repositories/people-cache.repository';
import { TMDBService } from './tmdb.service';

/**
 * People Cache Service - Cache-first approach cho people data
 * Tương tự như recommendation system nhưng specific cho people
 * Strategy: Check cache first → TMDB fallback → Cache results
 */
@Injectable()
export class PeopleCacheService {
  private readonly logger = new Logger(PeopleCacheService.name);

  constructor(
    private readonly peopleCacheRepository: PeopleCacheRepository,
    private readonly tmdbService: TMDBService,
  ) {}

  /**
   * ===== PERSON DETAILS =====
   */

  /**
   * Lấy person details - cache-first approach
   * @param tmdbId - TMDB ID của person
   * @returns Person details từ cache hoặc TMDB
   */
  async getPersonDetails(tmdbId: number): Promise<any> {
    try {
      const cachedPerson = await this.peopleCacheRepository.findPersonByTmdbId(tmdbId);

      if (cachedPerson) {
        return this.formatPersonResponse(cachedPerson.personData, true);
      }

      // Cache miss - fetch từ TMDB
      
      const tmdbPersonData = await this.tmdbService.getPersonDetails(tmdbId);
      
      if (!tmdbPersonData) {
        this.logger.warn(`⚠️ No person data found from TMDB for ID ${tmdbId}`);
        return null;
      }

      // 3. Cache result (async, không block response)
      setImmediate(() => {
        this.peopleCacheRepository.upsertPersonCache(tmdbId, tmdbPersonData)
          .catch(error => {
            this.logger.error(`Failed to cache person ${tmdbId}:`, error.message);
          });
      });

      return this.formatPersonResponse(tmdbPersonData, false);

    } catch (error) {
      this.logger.error(`❌ Error getting person details for ${tmdbId}:`, error.message);
      throw error;
    }
  }

  /**
   * ===== PERSON CREDITS =====
   */

  /**
   * Lấy person credits với pagination - cache-first approach
   * @param tmdbId - TMDB ID của person
   * @param page - Trang hiện tại (1-based)
   * @param limit - Số items per page
   * @param mediaType - Filter theo media type: 'movie' | 'tv' | 'all'
   * @param sortBy - Sắp xếp: 'release_date' | 'popularity' | 'vote_average'
   * @returns Paginated credits từ cache hoặc TMDB
   */
  async getPersonCreditsPaginated(
    tmdbId: number,
    page: number = 1,
    limit: number = 20,
    mediaType: 'movie' | 'tv' | 'all' = 'all',
    sortBy: 'release_date' | 'popularity' | 'vote_average' = 'release_date'
  ): Promise<{
    cast: any[];
    crew: any[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      limit: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
    metadata: {
      fromCache: boolean;
      totalCastItems: number;
      totalCrewItems: number;
      cacheInfo?: any;
    };
  }> {
    this.logger.debug(`🔍 Getting paginated credits for person TMDB ID ${tmdbId} (page ${page}, limit ${limit})`);

    try {
      // 1. Check cache first
      const cachedCredits = await this.peopleCacheRepository.findCreditsByPersonTmdbId(tmdbId);
      
      if (cachedCredits) {
        this.logger.debug(`✅ Cache hit for person ${tmdbId} credits`);
        return this.paginateCreditsFromCache(cachedCredits, page, limit, mediaType, sortBy);
      }

      // 2. Cache miss - fetch từ TMDB
      this.logger.debug(`❌ Cache miss for person ${tmdbId} credits, fetching from TMDB...`);
      
      const tmdbCreditsData = await this.tmdbService.getPersonCredits(tmdbId);
      
      if (!tmdbCreditsData) {
        this.logger.warn(`⚠️ No credits data found from TMDB for person ID ${tmdbId}`);
        return this.createEmptyCreditsResponse(page, limit);
      }

      // 3. Cache result (async, không block response)
      setImmediate(() => {
        this.peopleCacheRepository.upsertCreditsCache(tmdbId, tmdbCreditsData)
          .catch(error => {
            this.logger.error(`Failed to cache credits for person ${tmdbId}:`, error.message);
          });
      });

      this.logger.debug(`✅ Fetched credits from TMDB for person ${tmdbId}`);
      return this.paginateCreditsFromTMDB(tmdbCreditsData, page, limit, mediaType, sortBy);

    } catch (error) {
      this.logger.error(`❌ Error getting credits for person ${tmdbId}:`, error.message);
      throw error;
    }
  }

  /**
   * ===== HELPER METHODS =====
   */

  /**
   * Format person response với metadata
   */
  private formatPersonResponse(personData: any, fromCache: boolean) {
    return {
      ...personData,
      metadata: {
        fromCache,
        retrievedAt: new Date().toISOString(),
      }
    };
  }

  /**
   * Paginate credits từ cache data
   */
  private paginateCreditsFromCache(
    cachedCredits: any,
    page: number,
    limit: number,
    mediaType: string,
    sortBy: string
  ) {
    const { cast: allCast = [], crew: allCrew = [] } = cachedCredits.creditsData;

    // Filter theo media type
    const filteredCast = this.filterByMediaType(allCast, mediaType);
    const filteredCrew = this.filterByMediaType(allCrew, mediaType);

    // Sort theo yêu cầu (time-based sorting)
    const sortedCast = this.sortCredits(filteredCast, sortBy);
    const sortedCrew = this.sortCredits(filteredCrew, sortBy);

    // Combine for pagination
    const allItems = [...sortedCast, ...sortedCrew];
    const totalItems = allItems.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedItems = allItems.slice(startIndex, endIndex);

    // Separate back to cast/crew
    const paginatedCast = paginatedItems.filter(item => 
      sortedCast.some(castItem => castItem.id === item.id && castItem.media_type === item.media_type)
    );
    const paginatedCrew = paginatedItems.filter(item => 
      sortedCrew.some(crewItem => crewItem.id === item.id && crewItem.media_type === item.media_type)
    );

    return {
      cast: paginatedCast,
      crew: paginatedCrew,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      metadata: {
        fromCache: true,
        totalCastItems: sortedCast.length,
        totalCrewItems: sortedCrew.length,
        cacheInfo: {
          totalCreditsCount: cachedCredits.totalCreditsCount,
          latestReleaseDate: cachedCredits.latestReleaseDate,
          lastSynced: cachedCredits.lastSynced,
        }
      }
    };
  }

  /**
   * Paginate credits từ TMDB fresh data
   */
  private paginateCreditsFromTMDB(
    tmdbCreditsData: any,
    page: number,
    limit: number,
    mediaType: string,
    sortBy: string
  ) {
    const { cast: allCast = [], crew: allCrew = [] } = tmdbCreditsData;

    // Filter và sort giống như cache
    const filteredCast = this.filterByMediaType(allCast, mediaType);
    const filteredCrew = this.filterByMediaType(allCrew, mediaType);
    const sortedCast = this.sortCredits(filteredCast, sortBy);
    const sortedCrew = this.sortCredits(filteredCrew, sortBy);

    // Pagination logic
    const allItems = [...sortedCast, ...sortedCrew];
    const totalItems = allItems.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedItems = allItems.slice(startIndex, endIndex);

    const paginatedCast = paginatedItems.filter(item => 
      sortedCast.some(castItem => castItem.id === item.id && castItem.media_type === item.media_type)
    );
    const paginatedCrew = paginatedItems.filter(item => 
      sortedCrew.some(crewItem => crewItem.id === item.id && crewItem.media_type === item.media_type)
    );

    return {
      cast: paginatedCast,
      crew: paginatedCrew,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      metadata: {
        fromCache: false,
        totalCastItems: sortedCast.length,
        totalCrewItems: sortedCrew.length,
      }
    };
  }

  /**
   * Filter credits theo media type
   */
  private filterByMediaType(credits: any[], mediaType: string): any[] {
    if (mediaType === 'all') return credits;
    return credits.filter(item => item.media_type === mediaType);
  }

  /**
   * Sort credits theo tiêu chí (prioritize time-based)
   */
  private sortCredits(credits: any[], sortBy: string): any[] {
    return credits.sort((a, b) => {
      switch (sortBy) {
        case 'release_date':
          const dateA = new Date(a.release_date || a.first_air_date || '1900-01-01');
          const dateB = new Date(b.release_date || b.first_air_date || '1900-01-01');
          return dateB.getTime() - dateA.getTime(); // Newest first
        
        case 'popularity':
          return (b.popularity || 0) - (a.popularity || 0);
        
        case 'vote_average':
          return (b.vote_average || 0) - (a.vote_average || 0);
        
        default:
          return 0;
      }
    });
  }

  /**
   * Create empty response structure
   */
  private createEmptyCreditsResponse(page: number, limit: number) {
    return {
      cast: [],
      crew: [],
      pagination: {
        currentPage: page,
        totalPages: 0,
        totalItems: 0,
        limit,
        hasNextPage: false,
        hasPreviousPage: false,
      },
      metadata: {
        fromCache: false,
        totalCastItems: 0,
        totalCrewItems: 0,
      }
    };
  }

  /**
   * ===== ADMIN/MONITORING METHODS =====
   */

  /**
   * Force refresh person cache từ TMDB
   */
  async forceRefreshPersonCache(tmdbId: number): Promise<void> {
    this.logger.log(`🔄 Force refreshing cache for person TMDB ID ${tmdbId}`);

    const [personData, creditsData] = await Promise.all([
      this.tmdbService.getPersonDetails(tmdbId),
      this.tmdbService.getPersonCredits(tmdbId),
    ]);

    const promises = [];
    
    if (personData) {
      promises.push(this.peopleCacheRepository.upsertPersonCache(tmdbId, personData));
    }
    
    if (creditsData) {
      promises.push(this.peopleCacheRepository.upsertCreditsCache(tmdbId, creditsData));
    }

    await Promise.all(promises);
    this.logger.log(`✅ Force refresh completed for person ${tmdbId}`);
  }

  /**
   * Lấy cache statistics để monitoring
   */
  async getCacheStats(): Promise<any> {
    return await this.peopleCacheRepository.getCacheStats();
  }

  /**
   * Perform cleanup operations
   */
  async performCleanup(type: 'light' | 'major' = 'light'): Promise<any> {
    if (type === 'major') {
      return await this.peopleCacheRepository.performMajorCleanup();
    } else {
      return await this.peopleCacheRepository.cleanupOldUnusedCache();
    }
  }

  /**
   * Get paginated cast only
   */
  async getPersonCastPaginated(
    tmdbId: number,
    page: number = 1,
    limit: number = 20,
    mediaType: 'movie' | 'tv' | 'all' = 'all',
    sortBy: 'release_date' | 'popularity' | 'vote_average' = 'release_date'
  ): Promise<{
    cast: any[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      limit: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
    metadata: {
      fromCache: boolean;
      totalCastItems: number;
      cacheInfo?: any;
    };
  }> {
    this.logger.debug(`🔍 Getting paginated cast for person TMDB ID ${tmdbId} (page ${page}, limit ${limit})`);

    try {
      // 1. Check cache first
      const cachedCredits = await this.peopleCacheRepository.findCreditsByPersonTmdbId(tmdbId);
      
      if (cachedCredits) {
        this.logger.debug(`💰 Using cached cast for person ${tmdbId}`);
        return this.paginateCastFromCache(cachedCredits, page, limit, mediaType, sortBy);
      }

      // 2. If no cache, fetch from TMDB and paginate
      this.logger.debug(`🌐 Fetching fresh cast from TMDB for person ${tmdbId}`);
      const tmdbCreditsData = await this.tmdbService.getPersonCredits(tmdbId);
      
      if (tmdbCreditsData) {
        // Note: Cache saving can be implemented here if needed
        
        return this.paginateCastFromTMDB(tmdbCreditsData, page, limit, mediaType, sortBy);
      }

      throw new Error('No cast data available');

    } catch (error) {
      this.logger.error(`❌ Error getting paginated cast for person ${tmdbId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get paginated crew only
   */
  async getPersonCrewPaginated(
    tmdbId: number,
    page: number = 1,
    limit: number = 20,
    mediaType: 'movie' | 'tv' | 'all' = 'all',
    sortBy: 'release_date' | 'popularity' | 'vote_average' = 'release_date'
  ): Promise<{
    crew: any[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      limit: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
    metadata: {
      fromCache: boolean;
      totalCrewItems: number;
      cacheInfo?: any;
    };
  }> {
    this.logger.debug(`🔍 Getting paginated crew for person TMDB ID ${tmdbId} (page ${page}, limit ${limit})`);

    try {
      // 1. Check cache first
      const cachedCredits = await this.peopleCacheRepository.findCreditsByPersonTmdbId(tmdbId);
      
      if (cachedCredits) {
        this.logger.debug(`💰 Using cached crew for person ${tmdbId}`);
        return this.paginateCrewFromCache(cachedCredits, page, limit, mediaType, sortBy);
      }

      // 2. If no cache, fetch from TMDB and paginate
      this.logger.debug(`🌐 Fetching fresh crew from TMDB for person ${tmdbId}`);
      const tmdbCreditsData = await this.tmdbService.getPersonCredits(tmdbId);
      
      if (tmdbCreditsData) {
        // Note: Cache saving can be implemented here if needed
        
        return this.paginateCrewFromTMDB(tmdbCreditsData, page, limit, mediaType, sortBy);
      }

      throw new Error('No crew data available');

    } catch (error) {
      this.logger.error(`❌ Error getting paginated crew for person ${tmdbId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Paginate cast from cache data
   */
  private paginateCastFromCache(
    cachedCredits: any,
    page: number,
    limit: number,
    mediaType: string,
    sortBy: string
  ) {
    const allCast = cachedCredits.credits?.cast || [];
    
    // Filter và sort
    const filteredCast = this.filterByMediaType(allCast, mediaType);
    const sortedCast = this.sortCredits(filteredCast, sortBy);

    // Pagination logic
    const totalItems = sortedCast.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedCast = sortedCast.slice(startIndex, endIndex);

    return {
      cast: paginatedCast,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      metadata: {
        fromCache: true,
        totalCastItems: sortedCast.length,
        cacheInfo: {
          latestReleaseDate: cachedCredits.latestReleaseDate,
          lastSynced: cachedCredits.lastSynced,
        }
      }
    };
  }

  /**
   * Paginate crew from cache data
   */
  private paginateCrewFromCache(
    cachedCredits: any,
    page: number,
    limit: number,
    mediaType: string,
    sortBy: string
  ) {
    const allCrew = cachedCredits.credits?.crew || [];
    
    // Filter và sort
    const filteredCrew = this.filterByMediaType(allCrew, mediaType);
    const sortedCrew = this.sortCredits(filteredCrew, sortBy);

    // Pagination logic
    const totalItems = sortedCrew.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedCrew = sortedCrew.slice(startIndex, endIndex);

    return {
      crew: paginatedCrew,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      metadata: {
        fromCache: true,
        totalCrewItems: sortedCrew.length,
        cacheInfo: {
          latestReleaseDate: cachedCredits.latestReleaseDate,
          lastSynced: cachedCredits.lastSynced,
        }
      }
    };
  }

  /**
   * Paginate cast from TMDB fresh data
   */
  private paginateCastFromTMDB(
    tmdbCreditsData: any,
    page: number,
    limit: number,
    mediaType: string,
    sortBy: string
  ) {
    const { cast: allCast = [] } = tmdbCreditsData;

    // Filter và sort
    const filteredCast = this.filterByMediaType(allCast, mediaType);
    const sortedCast = this.sortCredits(filteredCast, sortBy);

    // Pagination logic
    const totalItems = sortedCast.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedCast = sortedCast.slice(startIndex, endIndex);

    return {
      cast: paginatedCast,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      metadata: {
        fromCache: false,
        totalCastItems: sortedCast.length,
      }
    };
  }

  /**
   * Paginate crew from TMDB fresh data
   */
  private paginateCrewFromTMDB(
    tmdbCreditsData: any,
    page: number,
    limit: number,
    mediaType: string,
    sortBy: string
  ) {
    const { crew: allCrew = [] } = tmdbCreditsData;

    // Filter và sort
    const filteredCrew = this.filterByMediaType(allCrew, mediaType);
    const sortedCrew = this.sortCredits(filteredCrew, sortBy);

    // Pagination logic
    const totalItems = sortedCrew.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedCrew = sortedCrew.slice(startIndex, endIndex);

    return {
      crew: paginatedCrew,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      metadata: {
        fromCache: false,
        totalCrewItems: sortedCrew.length,
      }
    };
  }
}
