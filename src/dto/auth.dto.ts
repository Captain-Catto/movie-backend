import { IsEmail, IsString, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RegisterDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "password123" })
  @IsString()
  password: string;

  @ApiPropertyOptional({ example: "John Doe" })
  @IsOptional()
  @IsString()
  name?: string;
}

export class LoginDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "password123" })
  @IsString()
  password: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: "abcdef1234567890abcdef" })
  @IsString()
  token: string;

  @ApiProperty({ example: "newpassword123" })
  @IsString()
  newPassword: string;
}
