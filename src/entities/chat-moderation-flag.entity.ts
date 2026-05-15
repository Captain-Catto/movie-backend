import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./user.entity";
import { ChatSession } from "./chat-session.entity";
import { ChatMessage } from "./chat-message.entity";

export enum ChatModerationSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

export enum ChatModerationStatus {
  OPEN = "open",
  RESOLVED = "resolved",
  IGNORED = "ignored",
}

@Entity("chat_moderation_flags")
@Index(["status", "createdAt"])
@Index(["userId", "createdAt"])
export class ChatModerationFlag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column()
  sessionId: number;

  @ManyToOne(() => ChatSession, { onDelete: "CASCADE" })
  @JoinColumn({ name: "sessionId" })
  session: ChatSession;

  @Column({ nullable: true })
  messageId: number | null;

  @ManyToOne(() => ChatMessage, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "messageId" })
  message: ChatMessage | null;

  @Column({ type: "text" })
  reason: string;

  @Column({
    type: "enum",
    enum: ChatModerationSeverity,
    default: ChatModerationSeverity.LOW,
  })
  severity: ChatModerationSeverity;

  @Column({
    type: "enum",
    enum: ChatModerationStatus,
    default: ChatModerationStatus.OPEN,
  })
  status: ChatModerationStatus;

  @Column({ nullable: true })
  reviewedBy: number | null;

  @Column({ type: "timestamp", nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
