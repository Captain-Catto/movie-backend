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
import {
  NotificationType,
  NotificationTargetType,
} from "../entities/notification-template.entity";

export class CreateNotificationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message: string;

  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType = NotificationType.INFO;

  @IsEnum(NotificationTargetType)
  targetType: NotificationTargetType;

  @IsString()
  @IsOptional()
  targetValue?: string; // userId for USER, role for ROLE, ignored for ALL

  @IsDateString()
  @IsOptional()
  scheduledAt?: string; // ISO date string for scheduled notifications
}

export class CreateBroadcastNotificationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message: string;

  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType = NotificationType.INFO;

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @IsOptional()
  metadata?: {
    startTime?: string;
    endTime?: string;
    [key: string]: any;
  };
}

export class CreateRoleNotificationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message: string;

  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType = NotificationType.INFO;

  @IsString()
  role: string; // user, admin, super_admin

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;
}

export class CreateUserNotificationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message: string;

  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType = NotificationType.INFO;

  @IsNumber()
  userId: number;

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;
}

export class GetNotificationsQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  limit?: number = 20;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @Transform(({ value }) => value === "true")
  @IsBoolean()
  unreadOnly?: boolean = false;
}

export class UpdateNotificationDto {
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
