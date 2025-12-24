import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./user.entity";

@Entity("viewer_audit_logs")
export class ViewerAuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ type: "varchar", length: 500 })
  endpoint: string;

  @Column({ type: "varchar", length: 10 })
  httpMethod: string;

  @Column({ type: "jsonb", nullable: true })
  payload: any;

  @Column({ type: "jsonb", nullable: true })
  queryParams: any;

  @Column({ type: "varchar", length: 100, nullable: true })
  ipAddress: string;

  @Column({ type: "text", nullable: true })
  userAgent: string;

  @Column({ type: "varchar", length: 200, nullable: true })
  attemptedAction: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;
}
