import {
  IsString,
  IsOptional,
  IsNumber,
  IsUrl,
  MaxLength,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateWatchPartyDto {
  @ApiPropertyOptional({ example: 550, description: "TMDB Movie ID" })
  @IsOptional()
  @IsNumber()
  movieId?: number;

  @ApiPropertyOptional({ example: 1396, description: "TMDB TV Series ID" })
  @IsOptional()
  @IsNumber()
  tvId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  season?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  episode?: number;

  @ApiProperty({
    example: "https://example.com/stream.m3u8",
    description: "Direct HLS/MP4 stream URL",
  })
  @IsString()
  @MinLength(1)
  streamUrl: string;

  @ApiProperty({ example: "Avengers: Endgame" })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  contentTitle: string;

  @ApiPropertyOptional({ example: "https://example.com/poster.jpg" })
  @IsOptional()
  @IsString()
  posterUrl?: string;
}

export interface WatchPartyResponseDto {
  id: number;
  inviteCode: string;
  inviteUrl: string;
  contentTitle: string;
  posterUrl: string | null;
  movieId: number | null;
  tvId: number | null;
  season: number | null;
  episode: number | null;
  streamUrl: string;
  hostId: number;
  hostName: string;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
}

export interface WatchPartyPublicInfoDto {
  id: number;
  inviteCode: string;
  contentTitle: string;
  posterUrl: string | null;
  movieId: number | null;
  tvId: number | null;
  season: number | null;
  episode: number | null;
  hostName: string;
  isActive: boolean;
  expiresAt: Date;
}
