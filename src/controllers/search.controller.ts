import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  HttpStatus,
  HttpCode,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SearchService } from "../services/search.service";
import { RecentSearchService } from "../services/recent-search.service";
import { SearchDto } from "../dto/query.dto";
import { ApiResponse } from "../interfaces/api.interface";
import { TMDB_MAX_PAGES } from "../constants/tmdb.constants";
import { ApiBearerAuth, ApiBody, ApiParam, ApiTags } from '@nestjs/swagger';
import {
  ApiStandardErrors,
  ApiSuccess,
} from "../swagger/api-response.decorators";

@ApiTags('Search')
@Controller("search")
export class SearchController {
  constructor(
    private searchService: SearchService,
    private recentSearchService: RecentSearchService
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Search movies, TV series, and people", dataType: "Search results", isArray: true })
  @ApiStandardErrors()
  async search(@Query() query: SearchDto): Promise<ApiResponse> {
    try {
      // Check TMDB API page limit
      if (query.page > TMDB_MAX_PAGES) {
        return {
          success: false,
          message: "Failed to perform search",
          error: `Page ${query.page} is beyond TMDB API limit. Maximum available page is ${TMDB_MAX_PAGES}.`,
          data: {
            retryable: false,
            errorType: "PageLimitExceeded",
          },
        };
      }

      // Use type parameter if provided, default to "multi"
      const searchType = query.type || "multi";

      const result = await this.searchService.searchMulti(
        query.q,
        query.page,
        searchType as "movie" | "tv" | "person" | "multi",
        query.language
      );

      return {
        success: true,
        message: "Search results retrieved successfully",
        data: result.data,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to perform search",
        error: error.message,
      };
    }
  }

  @Get("recent")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth("JWT")
  @ApiSuccess({ summary: "List authenticated user's recent searches", dataType: "Recent searches", isArray: true })
  @ApiStandardErrors({ unauthorized: true })
  async getRecentSearches(@Req() req: any): Promise<ApiResponse> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return {
          success: false,
          message: "User not authenticated",
          data: [],
        };
      }

      const recentSearches = await this.recentSearchService.getRecentSearches(
        userId
      );

      return {
        success: true,
        message: "Recent searches retrieved successfully",
        data: recentSearches,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to get recent searches",
        error: error.message,
        data: [],
      };
    }
  }

  @Post("recent")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth("JWT")
  @ApiSuccess({ summary: "Save a recent search for the authenticated user", dataType: "Recent search", status: HttpStatus.CREATED })
  @ApiStandardErrors({ unauthorized: true })
  @ApiBody({
    schema: {
      example: {
        query: "william",
        type: "person",
      },
    },
  })
  async saveRecentSearch(
    @Req() req: any,
    @Body() body: { query: string; type?: "movie" | "tv" | "person" | "all" }
  ): Promise<ApiResponse> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return {
          success: false,
          message: "User not authenticated",
        };
      }

      if (!body.query || body.query.trim().length === 0) {
        return {
          success: false,
          message: "Search query is required",
        };
      }

      const recentSearch = await this.recentSearchService.saveSearch(
        userId,
        body.query,
        body.type || "all"
      );

      return {
        success: true,
        message: "Search saved successfully",
        data: recentSearch,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to save search",
        error: error.message,
      };
    }
  }

  @Delete("recent")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth("JWT")
  @ApiSuccess({ summary: "Clear authenticated user's recent searches", dataType: "No content" })
  @ApiStandardErrors({ unauthorized: true })
  async clearRecentSearches(@Req() req: any): Promise<ApiResponse> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return {
          success: false,
          message: "User not authenticated",
        };
      }

      await this.recentSearchService.clearUserSearches(userId);

      return {
        success: true,
        message: "Recent searches cleared successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to clear recent searches",
        error: error.message,
      };
    }
  }

  @Delete("recent/:id")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth("JWT")
  @ApiSuccess({ summary: "Delete one recent search", dataType: "No content" })
  @ApiStandardErrors({ unauthorized: true, notFound: true })
  @ApiParam({ name: "id", type: Number, example: 1, description: "Recent search ID" })
  async deleteRecentSearch(
    @Req() req: any,
    @Param("id") id: string
  ): Promise<ApiResponse> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return {
          success: false,
          message: "User not authenticated",
        };
      }

      const searchId = parseInt(id, 10);
      if (isNaN(searchId)) {
        return {
          success: false,
          message: "Invalid search ID",
        };
      }

      await this.recentSearchService.deleteSearch(userId, searchId);

      return {
        success: true,
        message: "Search deleted successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to delete search",
        error: error.message,
      };
    }
  }
}
