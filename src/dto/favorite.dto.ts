import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from "class-validator";

export class AddFavoriteDto {
  @IsString()
  @IsNotEmpty()
  contentId: string;

  @IsEnum(["movie", "tv"])
  contentType: "movie" | "tv";
}

export class QueryFavoritesDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
