import { IsEmail, IsString, MinLength, IsOptional } from "class-validator";

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  name?: string; // Username/Display name
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
