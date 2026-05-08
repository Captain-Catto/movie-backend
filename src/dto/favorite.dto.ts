import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AddFavoriteDto {
  @ApiProperty({ example: "550" })
  @IsString()
  @IsNotEmpty()
  contentId: string;

  @ApiProperty({ enum: ["movie", "tv"], example: "movie" })
  @IsEnum(["movie", "tv"])
  contentType: "movie" | "tv";
}

export class QueryFavoritesDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100, default: 20 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
