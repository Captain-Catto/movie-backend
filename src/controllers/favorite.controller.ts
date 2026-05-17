import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { GetUser } from "../decorators/get-user.decorator";
import { FavoriteService } from "../services/favorite.service";
import { UserActivityLoggerService } from "../services/user-activity-logger.service";
import { ApiBody, ApiParam, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  ApiPaginationQueries,
  ApiStandardErrors,
  ApiSuccess,
} from "../swagger/api-response.decorators";

@ApiTags('Favorites')
@ApiBearerAuth('JWT')
@Controller("favorites")
@UseGuards(JwtAuthGuard)
export class FavoriteController {
  constructor(
    private readonly favoriteService: FavoriteService,
    private readonly userActivityLogger: UserActivityLoggerService
  ) {}

  @Get()
  @ApiSuccess({ summary: "List authenticated user's favorites", dataType: "Favorites", isArray: true })
  @ApiStandardErrors({ unauthorized: true })
  @ApiPaginationQueries()
  async getUserFavorites(
    @GetUser("id") userId: number,
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "20"
  ) {
    const pageNumber = parseInt(page) || 1;
    const limitNumber = parseInt(limit) || 20;

    return this.favoriteService.getUserFavorites(userId, {
      page: pageNumber,
      limit: limitNumber,
    });
  }

  @Post()
  @ApiSuccess({ summary: "Add a movie or TV series to favorites", dataType: "Favorite" })
  @ApiStandardErrors({ unauthorized: true })
  @ApiBody({ schema: { example: { contentId: "550", contentType: "movie" } } })
  async addToFavorites(
    @GetUser("id") userId: number,
    @Body() body: { contentId: string; contentType: "movie" | "tv" }
  ) {
    const result = await this.favoriteService.addToFavorites(
      userId,
      body.contentId,
      body.contentType
    );

    // Log favorite activity
    this.userActivityLogger
      .logFavoriteAction({
        userId,
        action: "ADD",
        movieId: parseInt(body.contentId) || 0,
        movieTitle: body.contentType === "movie" ? `Movie #${body.contentId}` : `TV #${body.contentId}`,
      })
      .catch(() => {});

    return result;
  }

  @Delete()
  @ApiSuccess({ summary: "Remove a movie or TV series from favorites", dataType: "No content" })
  @ApiStandardErrors({ unauthorized: true, notFound: true })
  @ApiBody({ schema: { example: { contentId: "550", contentType: "movie" } } })
  async removeFromFavorites(
    @GetUser("id") userId: number,
    @Body() body: { contentId: string; contentType: "movie" | "tv" }
  ) {
    await this.favoriteService.removeFromFavorites(
      userId,
      body.contentId,
      body.contentType
    );

    // Log favorite removal
    this.userActivityLogger
      .logFavoriteAction({
        userId,
        action: "REMOVE",
        movieId: parseInt(body.contentId) || 0,
        movieTitle: body.contentType === "movie" ? `Movie #${body.contentId}` : `TV #${body.contentId}`,
      })
      .catch(() => {});

    return {
      message: "Removed from favorites successfully",
      success: true,
    };
  }

  /**
   * Get only favorite IDs - lightweight endpoint for initial load
   * Returns array of {contentId, contentType} without full movie/TV data
   */
  @Get("ids")
  @ApiSuccess({ summary: "List favorite content IDs for the authenticated user", dataType: "Favorite IDs" })
  @ApiStandardErrors({ unauthorized: true })
  async getUserFavoriteIds(@GetUser("id") userId: number) {
    const ids = await this.favoriteService.getUserFavoriteIds(userId);
    return {
      ids,
      total: ids.length,
    };
  }

  /**
   * Check if specific item is in user's favorites
   * Fast boolean check without fetching all favorites
   */
  @Get("check/:contentId/:contentType")
  @ApiSuccess({ summary: "Check whether a content item is favorited", dataType: "Favorite status" })
  @ApiStandardErrors({ unauthorized: true })
  @ApiParam({ name: "contentId", type: String, example: "550" })
  @ApiParam({ name: "contentType", enum: ["movie", "tv"], example: "movie" })
  async checkIsFavorite(
    @GetUser("id") userId: number,
    @Param("contentId") contentId: string,
    @Param("contentType") contentType: "movie" | "tv"
  ) {
    const isFavorite = await this.favoriteService.checkIsFavorite(
      userId,
      contentId,
      contentType
    );
    return {
      isFavorite,
      contentId,
      contentType,
    };
  }
}
