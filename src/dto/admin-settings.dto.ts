import {
  IsInt,
  IsObject,
  Min,
  ValidateNested,
  IsBoolean,
  IsArray,
  IsIn,
  IsString,
  IsOptional,
  IsNumber,
  Max,
  ArrayMinSize,
  MinLength,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

class MinMaxDto {
  @ApiProperty({ example: 3, minimum: 1 })
  @IsInt()
  @Min(1)
  min: number;

  @ApiProperty({ example: 30, minimum: 1 })
  @IsInt()
  @Min(1)
  max: number;
}

// Red Envelope specific settings
export class RedEnvelopeSettingsDto {
  @ApiProperty({ example: 1.2, minimum: 0.1, maximum: 3 })
  @IsNumber()
  @Min(0.1)
  @Max(3)
  fallSpeed: number;

  @ApiProperty({ example: 1, minimum: 0.1, maximum: 5 })
  @IsNumber()
  @Min(0.1)
  @Max(5)
  rotationSpeed: number;

  @ApiProperty({ example: 0.2, minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  windStrength: number;

  @ApiProperty({ example: 0.02, minimum: 0, maximum: 0.1 })
  @IsNumber()
  @Min(0)
  @Max(0.1)
  sparkleFrequency: number;

  @ApiPropertyOptional({ example: 24, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  quantity?: number;
}

// Snow specific settings
export class SnowSettingsDto {
  @ApiProperty({ example: 1, minimum: 0.1, maximum: 3 })
  @IsNumber()
  @Min(0.1)
  @Max(3)
  speed: number;

  @ApiProperty({ example: 1, minimum: 0.5, maximum: 2 })
  @IsNumber()
  @Min(0.5)
  @Max(2)
  density: number;

  @ApiProperty({ example: 1, minimum: 0.5, maximum: 3 })
  @IsNumber()
  @Min(0.5)
  @Max(3)
  size: number;

  @ApiProperty({ example: 0.2, minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  windStrength: number;
}

export class RegistrationSettingsDto {
  @ApiProperty({ type: MinMaxDto })
  @ValidateNested()
  @Type(() => MinMaxDto)
  nickname: MinMaxDto;

  @ApiProperty({ type: MinMaxDto })
  @ValidateNested()
  @Type(() => MinMaxDto)
  password: MinMaxDto;
}

export class EffectSettingsDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ enum: ["snow", "redEnvelope", "fireworks", "sakura"], isArray: true, example: ["redEnvelope"] })
  @IsArray()
  @IsString({ each: true })
  @IsIn(["snow", "redEnvelope", "fireworks", "sakura"], { each: true })
  activeEffects: ("snow" | "redEnvelope" | "fireworks" | "sakura")[];

  @ApiProperty({ enum: ["low", "medium", "high"], example: "medium" })
  @IsString()
  @IsIn(["low", "medium", "high"])
  intensity: "low" | "medium" | "high";

  @ApiPropertyOptional({ type: RedEnvelopeSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RedEnvelopeSettingsDto)
  redEnvelopeSettings?: RedEnvelopeSettingsDto;

  @ApiPropertyOptional({ type: SnowSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SnowSettingsDto)
  snowSettings?: SnowSettingsDto;

  @ApiPropertyOptional({ example: ["/watch"], isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludedPaths?: string[];
}

export class StreamDomainSettingsDto {
  @ApiProperty({ example: ["vidsrc.xyz", "vidlink.pro"], isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  domains: string[];
}

export class SwaggerAuthSettingsDto {
  @ApiProperty({ example: "docs-admin" })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiPropertyOptional({
    example: "change-this-strong-password",
    description:
      "New Swagger password. Omit when updating only the username.",
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
