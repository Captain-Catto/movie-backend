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

export enum ContentType {
  MOVIE = "movie",
  TV_SERIES = "tv_series",
}

export enum ContentStatus {
  ACTIVE = "active",
  BLOCKED = "blocked",
  UNDER_REVIEW = "under_review",
}

@Entity("content_controls")
@Index(["contentId", "contentType"])
@Index(["status"])
export class ContentControl {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 50 })
  contentId: string; // TMDB ID

  @Column({
    type: "enum",
    enum: ContentType,
  })
  contentType: ContentType;

  @Column({
    type: "enum",
    enum: ContentStatus,
    default: ContentStatus.ACTIVE,
  })
  status: ContentStatus;

  @Column({ type: "text", nullable: true })
  reason: string; // Lý do chặn

  @Column({ nullable: true })
  blockedBy: number; // Admin user ID who blocked

  @Column({ type: "timestamp", nullable: true })
  blockedAt: Date;

  @Column({ type: "timestamp", nullable: true })
  unlockedAt: Date;

  @Column({ type: "text", nullable: true })
  notes: string; // Ghi chú admin

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "blockedBy" })
  blocker: User;

  // Helper methods
  get isBlocked(): boolean {
    return this.status === ContentStatus.BLOCKED;
  }

  get isActive(): boolean {
    return this.status === ContentStatus.ACTIVE;
  }
}
