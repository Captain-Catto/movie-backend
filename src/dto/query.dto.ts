import { IsOptional, IsString, IsNumber, Min } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class PaginationDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 24, minimum: 1, default: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 24;

  @ApiPropertyOptional({ example: "en-US", default: "en-US" })
  @IsOptional()
  @IsString()
  language?: string = "en-US";
}

export class MovieQueryDto extends PaginationDto {
  @ApiPropertyOptional({ example: "28,12", description: "Comma-separated genre IDs" })
  @IsOptional()
  @IsString()
  genres?: string;

  @ApiPropertyOptional({ example: 2024 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  year?: number;

  @ApiPropertyOptional({ example: "popularity.desc" })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ example: "US,GB", description: "Comma-separated country codes" })
  @IsOptional()
  @IsString()
  countries?: string;
}

export class TVQueryDto extends PaginationDto {
  @ApiPropertyOptional({ example: "18,10765", description: "Comma-separated genre IDs" })
  @IsOptional()
  @IsString()
  genres?: string;

  @ApiPropertyOptional({ example: 2024 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  year?: number;

  @ApiPropertyOptional({ example: "popularity.desc" })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ example: "US,GB", description: "Comma-separated country codes" })
  @IsOptional()
  @IsString()
  countries?: string;
}

export class SearchDto {
  @ApiPropertyOptional({ example: "Inception" })
  @IsString()
  q: string;

  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: "movie", description: "Filter by type: movie, tv, or person" })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: "en-US", default: "en-US" })
  @IsOptional()
  @IsString()
  language?: string = "en-US";
}
