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

export enum ChatMessageRole {
  USER = "user",
  ASSISTANT = "assistant",
  SYSTEM = "system",
}

@Entity("chat_messages")
@Index(["sessionId", "createdAt"])
@Index(["userId", "createdAt"])
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sessionId: number;

  @ManyToOne(() => ChatSession, (session) => session.messages, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "sessionId" })
  session: ChatSession;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({
    type: "enum",
    enum: ChatMessageRole,
  })
  role: ChatMessageRole;

  @Column({ type: "text" })
  content: string;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;
}
