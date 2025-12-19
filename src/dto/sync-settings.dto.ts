import { IsInt, IsOptional, Min } from "class-validator";

export class UpdateSyncSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  movieCatalogLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  tvCatalogLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  trendingCatalogLimit?: number;
}
