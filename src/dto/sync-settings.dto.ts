import { IsInt, IsOptional, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateSyncSettingsDto {
  @ApiPropertyOptional({ example: 500000, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  movieCatalogLimit?: number;

  @ApiPropertyOptional({ example: 200000, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  tvCatalogLimit?: number;

  @ApiPropertyOptional({ example: 100, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  trendingCatalogLimit?: number;

  @ApiPropertyOptional({ example: 1000, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  peopleCacheLimit?: number;

  @ApiPropertyOptional({ example: 1000, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  recommendationCacheLimit?: number;
}
