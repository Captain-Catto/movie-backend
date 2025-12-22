import { IsInt, IsObject, Min, ValidateNested } from "class-validator";
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
