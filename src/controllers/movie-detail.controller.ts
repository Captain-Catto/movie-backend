import {
  Controller,
  Get,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  ParseIntPipe,
} from "@nestjs/common";
import { MovieService } from "../services/movie.service";
import { ApiResponse } from "../interfaces/api.interface";

@Controller("movie")
export class MovieDetailController {
  constructor(private movieService: MovieService) {}

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  async getMovieWithCredits(
    @Param("id", ParseIntPipe) id: number,
    @Query("language") language: string = "en-US"
  ): Promise<ApiResponse> {
    try {
      const movieWithCredits = await this.movieService.findByTmdbIdWithCredits(
        id,
        language
      );

      return {
        success: true,
        message: "Movie with credits retrieved successfully",
        data: movieWithCredits,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to retrieve movie with credits",
        error: error.message,
      };
    }
  }
}
