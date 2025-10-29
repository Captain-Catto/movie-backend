import { IsOptional, IsString, IsNumber, Min } from "class-validator";
import { Type } from "class-transformer";

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 24;

  @IsOptional()
  @IsString()
  language?: string = "en-US";
}

export class MovieQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  genres?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  year?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  countries?: string;
}

export class TVQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  genres?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  year?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  countries?: string;
}

export class SearchDto {
  @IsString()
  q: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  language?: string = "en-US";
}
