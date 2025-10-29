import { Injectable } from "@nestjs/common";
import { MovieRepository } from "../repositories/movie.repository";
import { TVSeriesRepository } from "../repositories/tv-series.repository";
import { TMDBService } from "./tmdb.service";
import { PaginatedResult } from "../interfaces/api.interface";

@Injectable()
export class SearchService {
  constructor(
    private movieRepository: MovieRepository,
    private tvSeriesRepository: TVSeriesRepository,
    private tmdbService: TMDBService
  ) {}

  async searchMulti(
    query: string,
    page: number = 1,
    type: "movie" | "tv" | "multi" = "multi",
    language: string = "en-US"
  ): Promise<any> {
    try {
      console.log(`🔍 Searching locally in DB for: "${query}" (type: ${type})`);
      
      let results;
      
      switch (type) {
        case "movie":
          results = await this.movieRepository.search(query, page);
          return {
            success: true,
            message: "Movie search results retrieved successfully",
            data: {
              data: results.data.map((movie) => ({ ...movie, media_type: "movie" })),
              pagination: results.pagination,
            },
          };
        case "tv":
          results = await this.tvSeriesRepository.search(query, page);
          return {
            success: true,
            message: "TV search results retrieved successfully",
            data: {
              data: results.data.map((tv) => ({ ...tv, media_type: "tv" })),
              pagination: results.pagination,
            },
          };
        default:
          // Multi-search: combine movies and TV series from local DB
          return await this.searchLocal(query, page);
      }
    } catch (error) {
      console.error("Local search error:", error);
      console.log("🔄 Falling back to TMDB search...");
      
      // Fallback to TMDB search if local search fails
      return await this.searchTMDB(query, page, type, language);
    }
  }

  // Fallback TMDB search method
  private async searchTMDB(
    query: string,
    page: number = 1,
    type: "movie" | "tv" | "multi" = "multi",
    language: string = "en-US"
  ): Promise<any> {
    try {
      let tmdbResults;

      switch (type) {
        case "movie":
          tmdbResults = await this.tmdbService.searchMovies(
            query,
            page,
            language
          );
          break;
        case "tv":
          tmdbResults = await this.tmdbService.searchTV(query, page, language);
          break;
        default:
          tmdbResults = await this.tmdbService.searchMulti(
            query,
            page,
            language
          );
      }

      return {
        success: true,
        message: "Search results retrieved from TMDB",
        data: {
          data: tmdbResults.results || [],
          pagination: {
            page: tmdbResults.page || page,
            limit: 24,
            total: tmdbResults.total_results || 0,
            totalPages: tmdbResults.total_pages || 0,
          },
        },
      };
    } catch (error) {
      console.error("TMDB search error:", error);
      return {
        success: false,
        message: "Failed to search",
        data: {
          data: [],
          pagination: {
            page,
            limit: 24,
            total: 0,
            totalPages: 0,
          },
        },
      };
    }
  }

  // Keep local search for fallback
  async searchLocal(query: string, page: number = 1): Promise<any> {
    const [movieResults, tvResults] = await Promise.all([
      this.movieRepository.search(query, page),
      this.tvSeriesRepository.search(query, page),
    ]);

    // Combine results with media_type indicator
    const combinedData = [
      ...movieResults.data.map((movie) => ({ ...movie, media_type: "movie" })),
      ...tvResults.data.map((tv) => ({ ...tv, media_type: "tv" })),
    ];

    // Sort by popularity
    combinedData.sort((a, b) => b.popularity - a.popularity);

    const limit = 24;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = combinedData.slice(startIndex, endIndex);

    return {
      success: true,
      message: "Local search results retrieved successfully",
      data: {
        data: paginatedData,
        pagination: {
          page,
          limit,
          total: combinedData.length,
          totalPages: Math.ceil(combinedData.length / limit),
        },
      },
    };
  }

  // Legacy method for backward compatibility
  async searchAll(
    query: string,
    page: number = 1,
    language: string = "en-US"
  ): Promise<any> {
    return this.searchMulti(query, page, "multi", language);
  }
}
