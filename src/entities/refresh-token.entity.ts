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

@Entity("refresh_tokens")
@Index("idx_refresh_token", ["token"])
@Index("idx_user_token", ["userId", "token"])
export class RefreshToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "text" })
  token: string;

  @Column({ name: "user_id" })
  userId: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "expires_at", type: "timestamp" })
  expiresAt: Date;

  @Column({ name: "is_revoked", default: false })
  isRevoked: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @Column({ name: "ip_address", nullable: true })
  ipAddress: string;

  @Column({ name: "user_agent", nullable: true })
  userAgent: string;
}
