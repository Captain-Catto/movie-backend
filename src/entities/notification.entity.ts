import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./user.entity";

export enum NotificationType {
  INFO = "info",
  SUCCESS = "success",
  WARNING = "warning",
  ERROR = "error",
  SYSTEM = "system",
}

export enum NotificationTargetType {
  ALL = "all",
  USER = "user",
  ROLE = "role",
}

@Entity("notifications")
@Index(["userId", "isRead"]) // Optimize queries for user's unread notifications
@Index(["targetType", "targetValue"]) // Optimize queries for targeting
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  title: string;

  @Column({ type: "text" })
  message: string;

  @Column({
    type: "enum",
    enum: NotificationType,
    default: NotificationType.INFO,
  })
  type: NotificationType;

  @Column({
    type: "enum",
    enum: NotificationTargetType,
    default: NotificationTargetType.USER,
  })
  targetType: NotificationTargetType;

  @Column({ length: 100, nullable: true })
  targetValue: string; // userId, role name, or 'all'

  @Column({ default: false })
  isRead: boolean;

  @Column({ nullable: true })
  userId: number; // Recipient user ID

  @Column({ nullable: true })
  senderId: number; // Sender (admin) user ID

  @Column({ type: "timestamp", nullable: true })
  scheduledAt: Date; // For scheduled notifications

  @Column({ type: "timestamp", nullable: true })
  readAt: Date; // When notification was read

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "senderId" })
  sender: User;

  // Virtual properties
  get isScheduled(): boolean {
    return this.scheduledAt && this.scheduledAt > new Date();
  }

  get isExpired(): boolean {
    // Consider notifications older than 30 days as expired (optional)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return this.createdAt < thirtyDaysAgo;
  }
}
