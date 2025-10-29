import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  Movie,
  TVSeries,
  ContentControl,
  ContentStatus,
  ContentType,
  MediaType,
} from "../entities";
import { TrendingService } from "./trending.service";

export interface BlockContentDto {
  contentId: string;
  contentType: ContentType;
  reason: string;
  notes?: string;
}

export interface ContentListQuery {
  page?: number;
  limit?: number;
  status?: "blocked" | "active" | "all";
  contentType?: ContentType;
  search?: string;
}

export interface BlockTrendingDto {
  tmdbId: number;
  mediaType: MediaType;
  reason?: string;
}

@Injectable()
export class AdminContentService {
  private readonly logger = new Logger(AdminContentService.name);

  constructor(
    @InjectRepository(Movie)
    private movieRepository: Repository<Movie>,
    @InjectRepository(TVSeries)
    private tvRepository: Repository<TVSeries>,
    @InjectRepository(ContentControl)
    private contentControlRepository: Repository<ContentControl>,
    private trendingService: TrendingService
  ) {}

  // Block content
  async blockContent(
    dto: BlockContentDto,
    adminId: number
  ): Promise<ContentControl> {
    try {
      // Check if content exists
      await this.verifyContentExists(dto.contentId, dto.contentType);

      // Check if already has control record
      let control = await this.contentControlRepository.findOne({
        where: {
          contentId: dto.contentId,
          contentType: dto.contentType,
        },
      });

      if (control) {
        // Update existing
        control.status = ContentStatus.BLOCKED;
        control.reason = dto.reason;
        control.notes = dto.notes;
        control.blockedBy = adminId;
        control.blockedAt = new Date();
      } else {
        // Create new
        control = this.contentControlRepository.create({
          contentId: dto.contentId,
          contentType: dto.contentType,
          status: ContentStatus.BLOCKED,
          reason: dto.reason,
          notes: dto.notes,
          blockedBy: adminId,
          blockedAt: new Date(),
        });
      }

      await this.contentControlRepository.save(control);

      // Update content entity
      await this.updateContentBlockStatus(
        dto.contentId,
        dto.contentType,
        true,
        dto.reason
      );

      const tmdbIdNumber = parseInt(dto.contentId, 10);
      if (!Number.isNaN(tmdbIdNumber)) {
        try {
          await this.trendingService.hideContent(
            tmdbIdNumber,
            dto.contentType === ContentType.MOVIE
              ? MediaType.MOVIE
              : MediaType.TV,
            dto.reason
          );
        } catch (trendingError) {
          this.logger.warn(
            `Unable to hide trending entry for ${dto.contentType}:${dto.contentId}: ${trendingError.message}`
          );
        }
      }

      this.logger.log(
        `Content ${dto.contentType}:${dto.contentId} blocked by admin ${adminId}`
      );
      return control;
    } catch (error) {
      this.logger.error("Error blocking content:", error);
      throw error;
    }
  }

  // Unblock content
  async unblockContent(
    contentId: string,
    contentType: ContentType
  ): Promise<void> {
    try {
      const control = await this.contentControlRepository.findOne({
        where: { contentId, contentType },
      });

      if (control) {
        control.status = ContentStatus.ACTIVE;
        control.unlockedAt = new Date();
        await this.contentControlRepository.save(control);
      }

      // Update content entity
      await this.updateContentBlockStatus(contentId, contentType, false, null);

      const tmdbIdNumber = parseInt(contentId, 10);
      if (!Number.isNaN(tmdbIdNumber)) {
        try {
          await this.trendingService.unhideContent(
            tmdbIdNumber,
            contentType === ContentType.MOVIE
              ? MediaType.MOVIE
              : MediaType.TV
          );
        } catch (trendingError) {
          this.logger.warn(
            `Unable to unhide trending entry for ${contentType}:${contentId}: ${trendingError.message}`
          );
        }
      }

      this.logger.log(`Content ${contentType}:${contentId} unblocked`);
    } catch (error) {
      this.logger.error("Error unblocking content:", error);
      throw error;
    }
  }

  // Get all content with filters
  async getContentList(query: ContentListQuery) {
    const {
      page = 1,
      limit = 20,
      status = "all",
      contentType,
      search,
    } = query;

    try {
      const normalizedSearch = search?.trim();
      const parsedTmdbId =
        normalizedSearch && !Number.isNaN(Number(normalizedSearch))
          ? Number(normalizedSearch)
          : null;

      const normalizeMovie = (movie: Movie) => ({
        ...movie,
        contentType: ContentType.MOVIE,
      });

      const normalizeTV = (tv: TVSeries) => ({
        ...tv,
        contentType: ContentType.TV_SERIES,
      });

      const buildMovieQuery = () => {
        const movieQuery = this.movieRepository.createQueryBuilder("movie");

        if (status === "blocked") {
          movieQuery.where("movie.isBlocked = :blocked", { blocked: true });
        } else if (status === "active") {
          movieQuery.where("movie.isBlocked = :blocked", { blocked: false });
        }

        if (normalizedSearch) {
          movieQuery.andWhere(
            `(
              LOWER(movie.title) LIKE LOWER(:searchTerm) OR 
              LOWER(movie.originalTitle) LIKE LOWER(:searchTerm)
              ${parsedTmdbId !== null ? " OR movie.tmdbId = :tmdbSearch" : ""}
            )`,
            {
              searchTerm: `%${normalizedSearch}%`,
              ...(parsedTmdbId !== null ? { tmdbSearch: parsedTmdbId } : {}),
            }
          );
        }

        return movieQuery;
      };

      const buildTVQuery = () => {
        const tvQuery = this.tvRepository.createQueryBuilder("tv");

        if (status === "blocked") {
          tvQuery.where("tv.isBlocked = :blocked", { blocked: true });
        } else if (status === "active") {
          tvQuery.where("tv.isBlocked = :blocked", { blocked: false });
        }

        if (normalizedSearch) {
          tvQuery.andWhere(
            `(
              LOWER(tv.title) LIKE LOWER(:searchTerm) OR 
              LOWER(tv.originalTitle) LIKE LOWER(:searchTerm)
              ${parsedTmdbId !== null ? " OR tv.tmdbId = :tmdbSearch" : ""}
            )`,
            {
              searchTerm: `%${normalizedSearch}%`,
              ...(parsedTmdbId !== null ? { tmdbSearch: parsedTmdbId } : {}),
            }
          );
        }

        return tvQuery;
      };

      const fetchMovies = async () => {
        const [data, total] = await buildMovieQuery()
          .orderBy("movie.viewCount", "DESC")
          .skip((page - 1) * limit)
          .take(limit)
          .getManyAndCount();

        return {
          items: data.map(normalizeMovie),
          total,
        };
      };

      const fetchTVSeries = async () => {
        const [data, total] = await buildTVQuery()
          .orderBy("tv.viewCount", "DESC")
          .skip((page - 1) * limit)
          .take(limit)
          .getManyAndCount();

        return {
          items: data.map(normalizeTV),
          total,
        };
      };

      if (contentType === ContentType.MOVIE) {
        const { items, total } = await fetchMovies();
        return {
          items,
          total,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        };
      }

      if (contentType === ContentType.TV_SERIES) {
        const { items, total } = await fetchTVSeries();
        return {
          items,
          total,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        };
      }

      const [movieResult, tvResult] = await Promise.all([
        fetchMovies(),
        fetchTVSeries(),
      ]);

      const items = [...movieResult.items, ...tvResult.items];
      const total = movieResult.total + tvResult.total;

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    } catch (error) {
      this.logger.error("Error getting content list:", error);
      throw error;
    }
  }

  // Get blocked content list
  async getBlockedContent(page: number = 1, limit: number = 20) {
    try {
      const [items, total] = await this.contentControlRepository.findAndCount({
        where: { status: ContentStatus.BLOCKED },
        relations: ["blocker"],
        order: { blockedAt: "DESC" },
        skip: (page - 1) * limit,
        take: limit,
      });

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error("Error getting blocked content:", error);
      throw error;
    }
  }

  async getTrendingContent(page: number = 1, limit: number = 20) {
    try {
      const { data, pagination } = await this.trendingService.findAll(
        page,
        limit,
        { includeHidden: true }
      );

      const items = data.map((item) => {
        const isMovie = item.mediaType === MediaType.MOVIE;

        return {
          tmdbId: item.tmdbId,
          title: item.title,
          contentType: isMovie ? ContentType.MOVIE : ContentType.TV_SERIES,
          viewCount: Number(item.popularity ?? 0),
          clickCount: item.voteCount ?? 0,
          isBlocked: item.isHidden ?? false,
          blockReason: item.hiddenReason ?? undefined,
          posterPath: item.posterUrl ?? undefined,
          backdropPath: item.backdropUrl ?? undefined,
          voteAverage: item.voteAverage ?? 0,
          mediaType: item.mediaType,
          popularity: Number(item.popularity ?? 0),
        };
      });

      return {
        items,
        total: pagination.total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: pagination.totalPages,
      };
    } catch (error) {
      this.logger.error("Error getting trending content:", error);
      throw error;
    }
  }

  async hideTrendingContent(dto: BlockTrendingDto): Promise<void> {
    try {
      await this.trendingService.hideContent(
        dto.tmdbId,
        dto.mediaType,
        dto.reason
      );

      const contentType =
        dto.mediaType === MediaType.MOVIE
          ? ContentType.MOVIE
          : ContentType.TV_SERIES;

      await this.updateContentBlockStatus(
        dto.tmdbId.toString(),
        contentType,
        true,
        dto.reason ?? null
      );
    } catch (error) {
      this.logger.error("Error hiding trending content:", error);
      throw error;
    }
  }

  async unhideTrendingContent(
    tmdbId: number,
    mediaType: MediaType
  ): Promise<void> {
    try {
      await this.trendingService.unhideContent(tmdbId, mediaType);

      const contentType =
        mediaType === MediaType.MOVIE ? ContentType.MOVIE : ContentType.TV_SERIES;

      await this.updateContentBlockStatus(
        tmdbId.toString(),
        contentType,
        false,
        null
      );
    } catch (error) {
      this.logger.error("Error unhiding trending content:", error);
      throw error;
    }
  }

  // Get content stats
  async getContentStats() {
    try {
      const [totalMovies, blockedMovies] = await Promise.all([
        this.movieRepository.count(),
        this.movieRepository.count({ where: { isBlocked: true } }),
      ]);

      const [totalTVSeries, blockedTVSeries] = await Promise.all([
        this.tvRepository.count(),
        this.tvRepository.count({ where: { isBlocked: true } }),
      ]);

      const topMovies = await this.movieRepository.find({
        where: { isBlocked: false },
        order: { viewCount: "DESC" },
        take: 10,
      });

      const topTVSeries = await this.tvRepository.find({
        where: { isBlocked: false },
        order: { viewCount: "DESC" },
        take: 10,
      });

      return {
        movies: {
          total: totalMovies,
          active: totalMovies - blockedMovies,
          blocked: blockedMovies,
          topContent: topMovies,
        },
        tvSeries: {
          total: totalTVSeries,
          active: totalTVSeries - blockedTVSeries,
          blocked: blockedTVSeries,
          topContent: topTVSeries,
        },
        totalContent: totalMovies + totalTVSeries,
        totalBlocked: blockedMovies + blockedTVSeries,
      };
    } catch (error) {
      this.logger.error("Error getting content stats:", error);
      throw error;
    }
  }

  // Helper: Verify content exists
  private async verifyContentExists(
    contentId: string,
    contentType: ContentType
  ): Promise<boolean> {
    const repository =
      contentType === ContentType.MOVIE
        ? this.movieRepository
        : this.tvRepository;

    const content = await repository.findOne({
      where: { tmdbId: parseInt(contentId) },
    });

    if (!content) {
      throw new NotFoundException(
        `${contentType} with ID ${contentId} not found`
      );
    }

    return true;
  }

  // Helper: Update content block status
  private async updateContentBlockStatus(
    contentId: string,
    contentType: ContentType,
    isBlocked: boolean,
    reason: string | null
  ): Promise<void> {
    const repository =
      contentType === ContentType.MOVIE
        ? this.movieRepository
        : this.tvRepository;

    await repository.update(
      { tmdbId: parseInt(contentId) },
      { isBlocked, blockReason: reason }
    );
  }
}
