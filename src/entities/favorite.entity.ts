import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from "typeorm";
import { User } from "./user.entity";

@Entity("favorites")
// @Unique(["userId", "contentId", "contentType"]) // Will enable after cleanup
@Index(["userId", "createdAt"]) // Index for efficient user favorites query
@Index(["contentId", "contentType"]) // Index for content lookup
export class Favorite {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "user_id" })
  userId: number;

  @Column({ name: "content_id", type: "varchar", length: 50, nullable: true })
  contentId: string; // TMDB ID

  @Column({
    name: "content_type",
    type: "enum",
    enum: ["movie", "tv"],
    nullable: true,
  })
  contentType: "movie" | "tv";

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.favorites)
  user: User;
}
