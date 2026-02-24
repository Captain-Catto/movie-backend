import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { ContentTranslation } from "../entities/content-translation.entity";
import {
  getLanguageCandidates,
  normalizeLanguageTag,
} from "../constants/language.constants";

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
    const normalizedLanguage = normalizeLanguageTag(language);
    const languageCandidates = getLanguageCandidates(language);

    const existing = await this.repository.findOne({
      where: {
        tmdbId,
        contentType,
        language: In(languageCandidates),
      },
    });

    if (existing) {
      existing.language = normalizedLanguage;
      existing.title = title ?? existing.title;
      existing.overview = overview ?? existing.overview;
      return this.repository.save(existing);
    }

    return this.repository.save(
      this.repository.create({
        tmdbId,
        contentType,
        language: normalizedLanguage,
        title,
        overview,
      })
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
    const normalizedMap = new Map<
      string,
      {
        tmdbId: number;
        contentType: "movie" | "tv";
        language: string;
        title: string | null;
        overview: string | null;
      }
    >();

    for (const translation of translations) {
      const normalizedLanguage = normalizeLanguageTag(translation.language);
      const key = `${translation.tmdbId}:${translation.contentType}:${normalizedLanguage}`;

      normalizedMap.set(key, {
        ...translation,
        language: normalizedLanguage,
      });
    }

    // Use TypeORM upsert for batch operation
    await this.repository.upsert(
      Array.from(normalizedMap.values()).map((t) =>
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
    const languageCandidates = getLanguageCandidates(language);

    return this.repository.findOne({
      where: {
        tmdbId,
        contentType,
        language: In(languageCandidates),
      },
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
    const languageCandidates = getLanguageCandidates(language);

    return this.repository.find({
      where: {
        tmdbId: In(tmdbIds),
        contentType,
        language: In(languageCandidates),
      },
    });
  }
}
