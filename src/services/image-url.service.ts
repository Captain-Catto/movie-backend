import { Injectable } from "@nestjs/common";

@Injectable()
export class ImageUrlService {
  private readonly baseImageUrl = "https://image.tmdb.org/t/p";

  /**
   * Get full image URL from TMDB image path
   * @param imagePath - The path from TMDB API (e.g., "/36xXlhEpQqVVPuiZhfoQuaY4OlA.jpg")
   * @param size - Image size (w92, w154, w185, w342, w500, w780, original)
   * @returns Full image URL or null if no path provided
   */
  getImageUrl(imagePath: string, size: string = "w500"): string | null {
    if (!imagePath) return null;
    return `${this.baseImageUrl}/${size}${imagePath}`;
  }

  /**
   * Get full poster URL (optimized for posters)
   * Available sizes: w92, w154, w185, w342, w500, w780, original
   */
  getPosterUrl(posterPath: string, size: string = "w342"): string | null {
    return this.getImageUrl(posterPath, size);
  }

  /**
   * Get full backdrop URL (optimized for backdrops)
   * Available sizes: w300, w780, w1280, original
   */
  getBackdropUrl(backdropPath: string, size: string = "w1280"): string | null {
    return this.getImageUrl(backdropPath, size);
  }

  /**
   * Transform entity with image paths to include full URLs
   */
  addImageUrls<T extends { posterPath?: string; backdropPath?: string }>(
    entity: T
  ): T & {
    fullPosterUrl: string | null;
    fullBackdropUrl: string | null;
    thumbnailPosterUrl: string | null;
  } {
    return {
      ...entity,
      fullPosterUrl: this.getPosterUrl(entity.posterPath, "w500"),
      fullBackdropUrl: this.getBackdropUrl(entity.backdropPath, "w1280"),
      thumbnailPosterUrl: this.getPosterUrl(entity.posterPath, "w185"),
    };
  }

  /**
   * Transform array of entities with image paths to include full URLs
   */
  addImageUrlsToArray<T extends { posterPath?: string; backdropPath?: string }>(
    entities: T[]
  ): Array<
    T & {
      fullPosterUrl: string | null;
      fullBackdropUrl: string | null;
      thumbnailPosterUrl: string | null;
    }
  > {
    return entities.map((entity) => this.addImageUrls(entity));
  }
}
