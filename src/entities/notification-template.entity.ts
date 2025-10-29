import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./user.entity";
import { UserNotificationState } from "./user-notification-state.entity";
import { NotificationAnalytics } from "./notification-analytics.entity";

export enum NotificationType {
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
  SUCCESS = "success",
  SYSTEM = "system",
}

export enum NotificationTargetType {
  ALL = "all",
  ROLE = "role",
  USER = "user",
}

@Entity("notification_templates")
export class NotificationTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255 })
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
  })
  targetType: NotificationTargetType;

  @Column({ type: "varchar", length: 100 })
  targetValue: string; // "all", role name, or user id

  @Column({ type: "integer", nullable: true })
  senderId: number;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "senderId" })
  sender: User;

  @Column({ type: "integer", default: 1 })
  priority: number; // 1=low, 2=medium, 3=high

  @Column({ type: "jsonb", nullable: true })
  metadata: any;

  @Column({ type: "timestamp", nullable: true })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
