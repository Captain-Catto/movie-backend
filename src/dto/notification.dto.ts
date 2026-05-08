import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsArray,
  IsDateString,
  MinLength,
  MaxLength,
  IsBoolean,
} from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  NotificationType,
  NotificationTargetType,
} from "../entities/notification-template.entity";

export class CreateNotificationDto {
  @ApiProperty({ example: "System Maintenance", maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: "The system will be down for maintenance at 2am.", maxLength: 1000 })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message: string;

  @ApiPropertyOptional({ enum: NotificationType, default: NotificationType.INFO })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType = NotificationType.INFO;

  @ApiProperty({ enum: NotificationTargetType })
  @IsEnum(NotificationTargetType)
  targetType: NotificationTargetType;

  @ApiPropertyOptional({ example: "42", description: "userId for USER target, role name for ROLE target" })
  @IsString()
  @IsOptional()
  targetValue?: string;

  @ApiPropertyOptional({ example: "2025-12-31T00:00:00Z", description: "ISO date for scheduled notifications" })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;
}

export class CreateBroadcastNotificationDto {
  @ApiProperty({ example: "New Feature Released", maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: "We just launched dark mode!", maxLength: 1000 })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message: string;

  @ApiPropertyOptional({ enum: NotificationType, default: NotificationType.INFO })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType = NotificationType.INFO;

  @ApiPropertyOptional({ example: "2025-12-31T00:00:00Z" })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: {
    startTime?: string;
    endTime?: string;
    [key: string]: any;
  };
}

export class CreateRoleNotificationDto {
  @ApiProperty({ example: "Admin Alert", maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: "Please review the pending reports.", maxLength: 1000 })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message: string;

  @ApiPropertyOptional({ enum: NotificationType, default: NotificationType.INFO })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType = NotificationType.INFO;

  @ApiProperty({ example: "admin", description: "Target role: user, admin, super_admin" })
  @IsString()
  role: string;

  @ApiPropertyOptional({ example: "2025-12-31T00:00:00Z" })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;
}

export class CreateUserNotificationDto {
  @ApiProperty({ example: "Your account was updated", maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: "Your profile has been successfully updated.", maxLength: 1000 })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message: string;

  @ApiPropertyOptional({ enum: NotificationType, default: NotificationType.INFO })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType = NotificationType.INFO;

  @ApiProperty({ example: 42 })
  @IsNumber()
  userId: number;

  @ApiPropertyOptional({ example: "2025-12-31T00:00:00Z" })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class GetNotificationsQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  limit?: number = 20;

  @ApiPropertyOptional({ enum: NotificationType })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @Transform(({ value }) => value === "true")
  @IsBoolean()
  unreadOnly?: boolean = false;
}

export class UpdateNotificationDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;
}

export class NotificationResponseDto {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  targetType: NotificationTargetType;
  targetValue: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  priority: number;
  metadata?: any;
  analytics?: {
    totalTargetedUsers: number;
    deliveredCount: number;
    readCount: number;
    dismissedCount: number;
    clickCount: number;
  };
  createdBy?: {
    id: number;
    name: string;
    email: string;
  };
}

export class NotificationStatsDto {
  total: number;
  unread: number;
  read: number;
  recent: NotificationResponseDto[];
}
