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

@Entity("watch_parties")
@Index("idx_watch_parties_invite_code", ["inviteCode"])
@Index("idx_watch_parties_host_active", ["hostId", "isActive"])
export class WatchParty {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 10, unique: true, name: "invite_code" })
  inviteCode: string;

  @Column({ name: "host_id" })
  hostId: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "host_id" })
  host: User;

  @Column({ name: "movie_id", nullable: true, type: "integer" })
  movieId: number | null;

  @Column({ name: "tv_id", nullable: true, type: "integer" })
  tvId: number | null;

  @Column({ name: "season", nullable: true, type: "integer" })
  season: number | null;

  @Column({ name: "episode", nullable: true, type: "integer" })
  episode: number | null;

  @Column({ name: "stream_url", type: "text" })
  streamUrl: string;

  @Column({ name: "content_title", type: "varchar", length: 255 })
  contentTitle: string;

  @Column({ name: "poster_url", type: "text", nullable: true })
  posterUrl: string | null;

  @Column({ name: "is_active", default: true })
  isActive: boolean;

  @Column({ name: "expires_at", type: "timestamp" })
  expiresAt: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
