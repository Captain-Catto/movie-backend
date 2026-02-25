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

export enum ContentType {
  MOVIE = "movie",
  TV_SERIES = "tv_series",
}

export enum ActionType {
  VIEW = "view", // Xem phim
  CLICK = "click", // Click vào phim
  PLAY = "play", // Bấm play
  COMPLETE = "complete", // Xem xong
  SEARCH = "search", // Tìm kiếm
}

@Entity("view_analytics")
@Index(["contentId", "contentType"])
@Index(["userId", "actionType"])
@Index(["createdAt"])
@Index(["contentId", "actionType", "createdAt"])
export class ViewAnalytics {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 50 })
  contentId: string; // TMDB ID

  @Column({
    type: "enum",
    enum: ContentType,
  })
  contentType: ContentType;

  @Column({ nullable: true })
  userId: number;

  @Column({
    type: "enum",
    enum: ActionType,
  })
  actionType: ActionType;

  @Column({ type: "varchar", length: 255, nullable: true })
  contentTitle: string; // Cache title for faster queries

  @Column({ type: "integer", nullable: true })
  duration: number; // Thời gian xem (seconds)

  @Column({ type: "varchar", length: 100, nullable: true })
  ipAddress: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  userAgent: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  deviceType: string; // mobile, desktop, tablet

  @Column({ type: "varchar", length: 50, nullable: true })
  country: string;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>; // Extra data như quality, subtitle, etc.

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "userId" })
  user: User;

  // Virtual properties
  get isView(): boolean {
    return this.actionType === ActionType.VIEW;
  }

  get isClick(): boolean {
    return this.actionType === ActionType.CLICK;
  }

  get watchedPercentage(): number {
    if (!this.duration || !this.metadata?.totalDuration) {
      return 0;
    }
    return Math.min(100, (this.duration / this.metadata.totalDuration) * 100);
  }
}
