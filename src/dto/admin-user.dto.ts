import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from "class-validator";
import { UserRole } from "../entities/user.entity";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateUserDto {
  @ApiPropertyOptional({ example: "Jane Doe" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.USER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: "newPassword123", minLength: 6 })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
