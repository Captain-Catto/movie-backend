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

@Controller("favorites")
@UseGuards(JwtAuthGuard)
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Get()
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
  async addToFavorites(
    @GetUser("id") userId: number,
    @Body() body: { contentId: string; contentType: "movie" | "tv" }
  ) {
    return this.favoriteService.addToFavorites(
      userId,
      body.contentId,
      body.contentType
    );
  }

  @Delete()
  async removeFromFavorites(
    @GetUser("id") userId: number,
    @Body() body: { contentId: string; contentType: "movie" | "tv" }
  ) {
    await this.favoriteService.removeFromFavorites(
      userId,
      body.contentId,
      body.contentType
    );

    // Return proper JSON response instead of void
    return {
      message: "Removed from favorites successfully",
      success: true,
    };
  }
}
