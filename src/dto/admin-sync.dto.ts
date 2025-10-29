import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  Min,
} from "class-validator";

export class AdminSyncRequestDto {
  @IsOptional()
  @IsIn(["movies", "tv", "all", "today", "popular"])
  target?: "movies" | "tv" | "all" | "today" | "popular";

  @IsOptional()
  @IsISO8601()
  date?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  startFromBatch?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  batchSize?: number;
}
