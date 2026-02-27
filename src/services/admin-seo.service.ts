import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SeoMetadata, PageType } from "../entities";

export interface CreateSeoDto {
  pageType: PageType;
  pageSlug?: string;
  locale?: string;
  title: string;
  description: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  twitterSite?: string;
  twitterCreator?: string;
  canonicalUrl?: string;
  structuredData?: string;
  isActive?: boolean;
  noIndex?: boolean;
  noFollow?: boolean;
  customMeta?: Record<string, any>;
}

export interface UpdateSeoDto extends Partial<CreateSeoDto> {}

@Injectable()
export class AdminSeoService {
  private readonly logger = new Logger(AdminSeoService.name);

  constructor(
    @InjectRepository(SeoMetadata)
    private seoMetadataRepository: Repository<SeoMetadata>
  ) {}

  private normalizeLocale(input?: string | null): string {
    const value = (input || "").trim().toLowerCase();
    if (value.startsWith("en")) return "en";
    return "vi";
  }

  private normalizePath(input?: string | null): string | null {
    if (!input) return null;
    const trimmed = input.trim();
    if (!trimmed) return null;

    const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    if (withLeadingSlash.length > 1 && withLeadingSlash.endsWith("/")) {
      return withLeadingSlash.slice(0, -1);
    }
    return withLeadingSlash;
  }

  // Create SEO metadata
  async createSeoMetadata(dto: CreateSeoDto): Promise<SeoMetadata> {
    try {
      const seoMetadata = this.seoMetadataRepository.create({
        ...dto,
        pageSlug: this.normalizePath(dto.pageSlug),
        locale: this.normalizeLocale(dto.locale),
      });
      const saved = await this.seoMetadataRepository.save(seoMetadata);

      this.logger.log(
        `SEO metadata created for ${dto.pageType}:${dto.pageSlug || "/"}:${saved.locale}`
      );
      return saved;
    } catch (error) {
      this.logger.error("Error creating SEO metadata:", error);
      throw error;
    }
  }

  // Update SEO metadata
  async updateSeoMetadata(id: number, dto: UpdateSeoDto): Promise<SeoMetadata> {
    try {
      const seoMetadata = await this.seoMetadataRepository.findOne({
        where: { id },
      });

      if (!seoMetadata) {
        throw new NotFoundException(`SEO metadata with ID ${id} not found`);
      }

      const normalized: UpdateSeoDto = {
        ...dto,
        ...(dto.pageSlug !== undefined
          ? { pageSlug: this.normalizePath(dto.pageSlug) }
          : {}),
        ...(dto.locale !== undefined
          ? { locale: this.normalizeLocale(dto.locale) }
          : {}),
      };

      Object.assign(seoMetadata, normalized);
      const updated = await this.seoMetadataRepository.save(seoMetadata);

      this.logger.log(`SEO metadata ${id} updated`);
      return updated;
    } catch (error) {
      this.logger.error("Error updating SEO metadata:", error);
      throw error;
    }
  }

  // Delete SEO metadata
  async deleteSeoMetadata(id: number): Promise<void> {
    try {
      const result = await this.seoMetadataRepository.delete(id);

      if (result.affected === 0) {
        throw new NotFoundException(`SEO metadata with ID ${id} not found`);
      }

      this.logger.log(`SEO metadata ${id} deleted`);
    } catch (error) {
      this.logger.error("Error deleting SEO metadata:", error);
      throw error;
    }
  }

  // Get SEO metadata by ID
  async getSeoMetadata(id: number): Promise<SeoMetadata> {
    try {
      const seoMetadata = await this.seoMetadataRepository.findOne({
        where: { id },
      });

      if (!seoMetadata) {
        throw new NotFoundException(`SEO metadata with ID ${id} not found`);
      }

      return seoMetadata;
    } catch (error) {
      this.logger.error("Error getting SEO metadata:", error);
      throw error;
    }
  }

  // Get SEO metadata by page
  async getSeoByPage(
    pageType: PageType,
    pageSlug?: string,
    locale?: string
  ): Promise<SeoMetadata | null> {
    try {
      const normalizedPath = this.normalizePath(pageSlug);
      const seoMetadata = await this.seoMetadataRepository.findOne({
        where: {
          pageType,
          pageSlug: normalizedPath,
          locale: this.normalizeLocale(locale),
          isActive: true,
        },
      });

      return seoMetadata;
    } catch (error) {
      this.logger.error("Error getting SEO by page:", error);
      throw error;
    }
  }

  // Get all SEO metadata with pagination
  async getAllSeoMetadata(page: number = 1, limit: number = 20) {
    try {
      const [items, total] = await this.seoMetadataRepository.findAndCount({
        order: { createdAt: "DESC" },
        skip: (page - 1) * limit,
        take: limit,
      });

      return {
        data: items, // Frontend expects 'data' key
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error("Error getting all SEO metadata:", error);
      throw error;
    }
  }

  // Get SEO metadata by page type
  async getSeoByPageType(pageType: PageType) {
    try {
      const items = await this.seoMetadataRepository.find({
        where: { pageType },
        order: { createdAt: "DESC" },
      });

      return items;
    } catch (error) {
      this.logger.error("Error getting SEO by page type:", error);
      throw error;
    }
  }

  // Toggle SEO active status
  async toggleSeoStatus(id: number): Promise<SeoMetadata> {
    try {
      const seoMetadata = await this.seoMetadataRepository.findOne({
        where: { id },
      });

      if (!seoMetadata) {
        throw new NotFoundException(`SEO metadata with ID ${id} not found`);
      }

      seoMetadata.isActive = !seoMetadata.isActive;
      const updated = await this.seoMetadataRepository.save(seoMetadata);

      this.logger.log(
        `SEO metadata ${id} ${updated.isActive ? "activated" : "deactivated"}`
      );
      return updated;
    } catch (error) {
      this.logger.error("Error toggling SEO status:", error);
      throw error;
    }
  }

  // Bulk create default SEO for common pages
  async createDefaultSeoMetadata(): Promise<SeoMetadata[]> {
    try {
      const defaultPages = [
        SeoMetadata.createHomePage(),
        SeoMetadata.createMoviesPage(),
        {
          pageType: PageType.TV_SERIES,
          pageSlug: "/tv",
          title: "Phim Bộ - Xem phim bộ hay nhất",
          description:
            "Tuyển tập phim bộ đặc sắc từ Hàn Quốc, Trung Quốc, Thái Lan và các quốc gia khác. Cập nhật tập mới liên tục.",
          keywords: "phim bộ, phim hàn quốc, phim trung quốc, phim bộ hay",
          ogType: "website",
          twitterCard: "summary_large_image",
        },
        {
          pageType: PageType.TRENDING,
          pageSlug: "/trending",
          title: "Trending - Phim đang hot",
          description:
            "Những bộ phim đang được yêu thích và thịnh hành nhất hiện nay. Cập nhật xu hướng xem phim mới nhất.",
          keywords: "phim hot, phim trending, phim thịnh hành",
          ogType: "website",
          twitterCard: "summary_large_image",
        },
        {
          pageType: PageType.BROWSE,
          pageSlug: "/browse",
          title: "Duyệt Phim - Khám phá kho phim đa dạng",
          description:
            "Duyệt qua hàng ngàn bộ phim theo thể loại, năm phát hành, quốc gia. Tìm ngay bộ phim yêu thích của bạn.",
          keywords: "duyệt phim, tìm phim, thể loại phim",
          ogType: "website",
          twitterCard: "summary_large_image",
        },
      ];

      const created: SeoMetadata[] = [];

      for (const pageData of defaultPages) {
        const existing = await this.getSeoByPage(
          pageData.pageType,
          pageData.pageSlug,
          "vi"
        );

        if (!existing) {
          const seoMetadata = this.seoMetadataRepository.create({
            ...pageData,
            pageSlug: this.normalizePath(pageData.pageSlug),
            locale: "vi",
          });
          const saved = await this.seoMetadataRepository.save(seoMetadata);
          created.push(saved);
        }
      }

      this.logger.log(`Created ${created.length} default SEO metadata`);
      return created;
    } catch (error) {
      this.logger.error("Error creating default SEO metadata:", error);
      throw error;
    }
  }

  // Get SEO stats
  async getSeoStats() {
    try {
      const total = await this.seoMetadataRepository.count();
      const active = await this.seoMetadataRepository.count({
        where: { isActive: true },
      });
      const noIndex = await this.seoMetadataRepository.count({
        where: { noIndex: true },
      });

      // Count by page type
      const byPageType: Record<string, number> = {};
      for (const pageType of Object.values(PageType)) {
        byPageType[pageType] = await this.seoMetadataRepository.count({
          where: { pageType },
        });
      }

      return {
        total,
        active,
        inactive: total - active,
        noIndex,
        byPageType,
      };
    } catch (error) {
      this.logger.error("Error getting SEO stats:", error);
      throw error;
    }
  }

  async resolveSeoByPath(
    path: string,
    locale?: string
  ): Promise<SeoMetadata | null> {
    const normalizedPath = this.normalizePath(path);
    if (!normalizedPath) return null;

    const requestedLocale = this.normalizeLocale(locale);
    const fallbackLocales = Array.from(
      new Set([requestedLocale, "vi", "en"])
    );

    for (const candidateLocale of fallbackLocales) {
      const match = await this.seoMetadataRepository.findOne({
        where: {
          pageSlug: normalizedPath,
          locale: candidateLocale,
          isActive: true,
        },
        order: {
          updatedAt: "DESC",
        },
      });

      if (match) return match;
    }

    return null;
  }
}
