import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from "typeorm";
import { User } from "./user.entity";
import { ChatMessage } from "./chat-message.entity";

export enum ChatSessionStatus {
  ACTIVE = "active",
  ARCHIVED = "archived",
}

@Entity("chat_sessions")
@Index(["userId", "updatedAt"])
export class ChatSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", length: 255, nullable: true })
  title: string | null;

  @Column({
    type: "enum",
    enum: ChatSessionStatus,
    default: ChatSessionStatus.ACTIVE,
  })
  status: ChatSessionStatus;

  @OneToMany(() => ChatMessage, (message) => message.session)
  messages: ChatMessage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
