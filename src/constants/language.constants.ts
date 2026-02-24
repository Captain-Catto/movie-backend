import { TMDB_DEFAULT_LANGUAGE } from "./tmdb.constants";

export const VIETNAMESE_LANGUAGE = "vi-VN";

export function normalizeLanguageTag(language?: string): string {
  if (!language || !language.trim()) {
    return TMDB_DEFAULT_LANGUAGE;
  }

  const trimmed = language.trim();
  const normalized = trimmed.toLowerCase().replace(/_/g, "-");

  if (normalized === "vi" || normalized === "vi-vn") {
    return VIETNAMESE_LANGUAGE;
  }

  if (normalized === "en" || normalized === "en-us") {
    return TMDB_DEFAULT_LANGUAGE;
  }

  return trimmed;
}

export function getLanguageCandidates(language?: string): string[] {
  const normalized = normalizeLanguageTag(language);

  if (normalized === VIETNAMESE_LANGUAGE) {
    return [VIETNAMESE_LANGUAGE, "vi"];
  }

  return [normalized];
}

