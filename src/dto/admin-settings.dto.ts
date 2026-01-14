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
} from "class-validator";
import { Type } from "class-transformer";

class MinMaxDto {
  @IsInt()
  @Min(1)
  min: number;

  @IsInt()
  @Min(1)
  max: number;
}

// Red Envelope specific settings
export class RedEnvelopeSettingsDto {
  @IsNumber()
  @Min(0.1)
  @Max(3)
  fallSpeed: number;

  @IsNumber()
  @Min(0.1)
  @Max(5)
  rotationSpeed: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  windStrength: number;

  @IsNumber()
  @Min(0)
  @Max(0.1)
  sparkleFrequency: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  quantity?: number;
}

// Snow specific settings
export class SnowSettingsDto {
  @IsNumber()
  @Min(0.1)
  @Max(3)
  speed: number;

  @IsNumber()
  @Min(0.5)
  @Max(2)
  density: number;

  @IsNumber()
  @Min(0.5)
  @Max(3)
  size: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  windStrength: number;
}

export class RegistrationSettingsDto {
  @ValidateNested()
  @Type(() => MinMaxDto)
  nickname: MinMaxDto;

  @ValidateNested()
  @Type(() => MinMaxDto)
  password: MinMaxDto;
}

export class EffectSettingsDto {
  @IsBoolean()
  enabled: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsIn(["snow", "redEnvelope", "fireworks", "sakura"], { each: true })
  activeEffects: ("snow" | "redEnvelope" | "fireworks" | "sakura")[];

  @IsString()
  @IsIn(["low", "medium", "high"])
  intensity: "low" | "medium" | "high";

  @IsOptional()
  @ValidateNested()
  @Type(() => RedEnvelopeSettingsDto)
  redEnvelopeSettings?: RedEnvelopeSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SnowSettingsDto)
  snowSettings?: SnowSettingsDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludedPaths?: string[];
}
