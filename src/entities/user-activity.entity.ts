import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./user.entity";

export enum ActivityType {
  LOGIN = "login",
  LOGOUT = "logout",
  SEARCH = "search",
  FAVORITE_ADD = "favorite_add",
  FAVORITE_REMOVE = "favorite_remove",
  VIEW_CONTENT = "view_content",
  CLICK_CONTENT = "click_content",
  PROFILE_UPDATE = "profile_update",
  PASSWORD_CHANGE = "password_change",
  NOTIFICATION_READ = "notification_read",
}

@Entity("user_activities")
@Index(["userId", "createdAt"])
@Index(["activityType", "createdAt"])
export class UserActivity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({
    type: "enum",
    enum: ActivityType,
  })
  activityType: ActivityType;

  @Column({ type: "varchar", length: 255, nullable: true })
  description: string; // Mô tả hoạt động

  @Column({ type: "varchar", length: 100, nullable: true })
  ipAddress: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  userAgent: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  deviceType: string; // mobile, desktop, tablet

  @Column({ type: "varchar", length: 50, nullable: true })
  country: string;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>; // Extra data: contentId, searchQuery, etc.

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  // Helper methods
  static createLoginActivity(
    userId: number,
    ipAddress?: string,
    userAgent?: string
  ): Partial<UserActivity> {
    return {
      userId,
      activityType: ActivityType.LOGIN,
      description: "User logged in",
      ipAddress,
      userAgent,
    };
  }

  static createSearchActivity(
    userId: number,
    query: string,
    metadata?: Record<string, any>
  ): Partial<UserActivity> {
    return {
      userId,
      activityType: ActivityType.SEARCH,
      description: `Searched for: ${query}`,
      metadata: { query, ...metadata },
    };
  }

  static createFavoriteActivity(
    userId: number,
    contentId: string,
    contentType: string,
    isAdd: boolean
  ): Partial<UserActivity> {
    return {
      userId,
      activityType: isAdd
        ? ActivityType.FAVORITE_ADD
        : ActivityType.FAVORITE_REMOVE,
      description: `${isAdd ? "Added" : "Removed"} ${contentType} ${contentId} ${isAdd ? "to" : "from"} favorites`,
      metadata: { contentId, contentType },
    };
  }

  static createContentActivity(
    userId: number,
    contentId: string,
    contentType: string,
    contentTitle: string,
    isView: boolean
  ): Partial<UserActivity> {
    return {
      userId,
      activityType: isView
        ? ActivityType.VIEW_CONTENT
        : ActivityType.CLICK_CONTENT,
      description: `${isView ? "Viewed" : "Clicked"} ${contentType}: ${contentTitle}`,
      metadata: { contentId, contentType, contentTitle },
    };
  }
}
