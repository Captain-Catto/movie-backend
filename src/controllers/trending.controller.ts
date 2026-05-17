import { Controller, Get, HttpStatus, HttpCode, Query } from "@nestjs/common";
import { TrendingService } from "../services/trending.service";
import { ApiResponse } from "../interfaces/api.interface";
import { PaginationDto } from "../dto/query.dto";
import { ApiTags } from '@nestjs/swagger';
import {
  ApiLanguageQuery,
  ApiPaginationQueries,
  ApiStandardErrors,
  ApiSuccess,
} from "../swagger/api-response.decorators";

@ApiTags('Trending')
@Controller("trending")
export class TrendingController {
  constructor(private trendingService: TrendingService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({
    summary: "List trending movies and TV series",
    dataType: "Trending content list",
  })
  @ApiPaginationQueries()
  @ApiLanguageQuery()
  @ApiStandardErrors()
  async getTrending(@Query() query: PaginationDto): Promise<ApiResponse> {
    try {
      const result = await this.trendingService.findAll(
        query.page || 1,
        query.limit || 24,
        {},
        query.language || "en-US"
      );

      return {
        success: true,
        message: "Trending items retrieved successfully",
        data: result.data,
        pagination: result.pagination,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve trending items",
        error: error.message,
      };
    }
  }
}
