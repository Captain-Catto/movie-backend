import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { ContentTranslation } from "../entities/content-translation.entity";

@Injectable()
export class ContentTranslationRepository {
  constructor(
    @InjectRepository(ContentTranslation)
    private repository: Repository<ContentTranslation>
  ) {}

  /**
   * Upsert a single translation (INSERT or UPDATE on conflict)
   */
  async upsert(
    tmdbId: number,
    contentType: "movie" | "tv",
    language: string,
    title: string | null,
    overview: string | null
  ): Promise<ContentTranslation> {
    const existing = await this.repository.findOne({
      where: { tmdbId, contentType, language },
    });

    if (existing) {
      existing.title = title ?? existing.title;
      existing.overview = overview ?? existing.overview;
      return this.repository.save(existing);
    }

    return this.repository.save(
      this.repository.create({ tmdbId, contentType, language, title, overview })
    );
  }

  /**
   * Bulk upsert translations for better sync performance
   */
  async bulkUpsert(
    translations: Array<{
      tmdbId: number;
      contentType: "movie" | "tv";
      language: string;
      title: string | null;
      overview: string | null;
    }>
  ): Promise<void> {
    if (translations.length === 0) return;

    // Use TypeORM upsert for batch operation
    await this.repository.upsert(
      translations.map((t) =>
        this.repository.create({
          tmdbId: t.tmdbId,
          contentType: t.contentType,
          language: t.language,
          title: t.title,
          overview: t.overview,
        })
      ),
      {
        conflictPaths: ["tmdbId", "contentType", "language"],
        skipUpdateIfNoValuesChanged: true,
      }
    );
  }

  /**
   * Find translation for a single content item
   */
  async findByTmdbId(
    tmdbId: number,
    contentType: "movie" | "tv",
    language: string
  ): Promise<ContentTranslation | null> {
    return this.repository.findOne({
      where: { tmdbId, contentType, language },
    });
  }

  /**
   * Find translations for multiple content items (batch query)
   */
  async findByTmdbIds(
    tmdbIds: number[],
    contentType: "movie" | "tv",
    language: string
  ): Promise<ContentTranslation[]> {
    if (tmdbIds.length === 0) return [];

    return this.repository.find({
      where: {
        tmdbId: In(tmdbIds),
        contentType,
        language,
      },
    });
  }
}
