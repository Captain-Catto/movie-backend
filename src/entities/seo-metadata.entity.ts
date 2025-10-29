import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from "typeorm";

export enum PageType {
  HOME = "home",
  MOVIES = "movies",
  TV_SERIES = "tv_series",
  TRENDING = "trending",
  BROWSE = "browse",
  FAVORITES = "favorites",
  PEOPLE = "people",
  CUSTOM = "custom",
}

@Entity("seo_metadata")
@Unique(["pageType", "pageSlug"])
@Index(["pageType"])
@Index(["isActive"])
export class SeoMetadata {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: "enum",
    enum: PageType,
  })
  pageType: PageType;

  @Column({ type: "varchar", length: 255, nullable: true })
  pageSlug: string; // e.g., "/movies/action", "/movie/123"

  @Column({ type: "varchar", length: 255 })
  title: string; // SEO title

  @Column({ type: "text" })
  description: string; // Meta description

  @Column({ type: "text", nullable: true })
  keywords: string; // SEO keywords (comma separated)

  @Column({ type: "varchar", length: 500, nullable: true })
  ogTitle: string; // Open Graph title

  @Column({ type: "text", nullable: true })
  ogDescription: string; // Open Graph description

  @Column({ type: "varchar", length: 500, nullable: true })
  ogImage: string; // Open Graph image URL

  @Column({ type: "varchar", length: 100, nullable: true })
  ogType: string; // website, article, video.movie, etc.

  @Column({ type: "varchar", length: 500, nullable: true })
  twitterCard: string; // summary, summary_large_image, etc.

  @Column({ type: "varchar", length: 255, nullable: true })
  twitterSite: string; // @username

  @Column({ type: "varchar", length: 255, nullable: true })
  twitterCreator: string; // @username

  @Column({ type: "varchar", length: 500, nullable: true })
  canonicalUrl: string; // Canonical URL

  @Column({ type: "text", nullable: true })
  structuredData: string; // JSON-LD structured data

  @Column({ default: true })
  isActive: boolean; // Enable/disable SEO

  @Column({ default: false })
  noIndex: boolean; // noindex meta tag

  @Column({ default: false })
  noFollow: boolean; // nofollow meta tag

  @Column({ type: "jsonb", nullable: true })
  customMeta: Record<string, any>; // Extra meta tags

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  static createHomePage(): Partial<SeoMetadata> {
    return {
      pageType: PageType.HOME,
      pageSlug: "/",
      title: "MovieStream - Xem phim trực tuyến miễn phí",
      description:
        "Xem phim lẻ, phim bộ, phim chiếu rạp mới nhất với chất lượng HD. Kho phim khổng lồ cập nhật liên tục mỗi ngày.",
      keywords:
        "xem phim, phim hay, phim mới, phim chiếu rạp, phim bộ, phim lẻ",
      ogType: "website",
      twitterCard: "summary_large_image",
    };
  }

  static createMoviesPage(): Partial<SeoMetadata> {
    return {
      pageType: PageType.MOVIES,
      pageSlug: "/movies",
      title: "Phim Lẻ - Xem phim chiếu rạp mới nhất",
      description:
        "Tuyển tập phim lẻ hay nhất từ Hollywood, Châu Á và các quốc gia khác. Cập nhật liên tục phim mới mỗi ngày.",
      keywords: "phim lẻ, phim chiếu rạp, phim hollywood, phim hành động",
      ogType: "website",
      twitterCard: "summary_large_image",
    };
  }

  get metaTags(): Record<string, string> {
    const tags: Record<string, string> = {
      title: this.title,
      description: this.description,
    };

    if (this.keywords) tags.keywords = this.keywords;
    if (this.ogTitle) tags["og:title"] = this.ogTitle;
    if (this.ogDescription) tags["og:description"] = this.ogDescription;
    if (this.ogImage) tags["og:image"] = this.ogImage;
    if (this.ogType) tags["og:type"] = this.ogType;
    if (this.twitterCard) tags["twitter:card"] = this.twitterCard;
    if (this.twitterSite) tags["twitter:site"] = this.twitterSite;
    if (this.twitterCreator) tags["twitter:creator"] = this.twitterCreator;
    if (this.canonicalUrl) tags.canonical = this.canonicalUrl;

    return tags;
  }
}
