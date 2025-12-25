import {
  IsInt,
  IsObject,
  Min,
  ValidateNested,
  IsBoolean,
  IsArray,
  IsIn,
  IsString,
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

export class RegistrationSettingsDto {
  @ValidateNested()
  @Type(() => MinMaxDto)
  id: MinMaxDto;

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
}
