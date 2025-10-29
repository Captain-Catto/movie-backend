import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from "typeorm";

@Entity("notification_analytics")
export class NotificationAnalytics {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "integer", unique: true })
  templateId: number;

  @Column({ type: "integer", default: 0 })
  totalTargetedUsers: number;

  @Column({ type: "integer", default: 0 })
  deliveredCount: number;

  @Column({ type: "integer", default: 0 })
  readCount: number;

  @Column({ type: "integer", default: 0 })
  dismissedCount: number;

  @Column({ type: "integer", default: 0 })
  clickCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
