import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  Min,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class AdminSyncRequestDto {
  @ApiPropertyOptional({
    enum: ["movies", "tv", "all", "today", "popular", "trending"],
    default: "all",
    example: "all",
  })
  @IsOptional()
  @IsIn(["movies", "tv", "all", "today", "popular", "trending"])
  target?: "movies" | "tv" | "all" | "today" | "popular" | "trending";

  @ApiPropertyOptional({ example: "2026-05-16", description: "ISO date for daily export sync" })
  @IsOptional()
  @IsISO8601()
  date?: string;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  startFromBatch?: number;

  @ApiPropertyOptional({ example: 100, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  batchSize?: number;
}
