import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./user.entity";

export enum NotificationState {
  DELIVERED = "delivered",
  READ = "read",
  DISMISSED = "dismissed",
  ARCHIVED = "archived",
}

@Entity("user_notification_states")
export class UserNotificationState {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "integer" })
  templateId: number;

  @Column({ type: "integer" })
  userId: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({
    type: "enum",
    enum: NotificationState,
    default: NotificationState.DELIVERED,
  })
  state: NotificationState;

  @Column({ type: "timestamp", nullable: true })
  readAt: Date;

  @Column({ type: "timestamp", nullable: true })
  dismissedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
