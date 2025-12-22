import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  OneToMany,
} from "typeorm";
import * as bcrypt from "bcrypt";
import { Favorite } from "./favorite.entity";

export enum UserRole {
  USER = "user",
  ADMIN = "admin",
  SUPER_ADMIN = "super_admin",
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password: string;

  @Column({ nullable: true })
  name: string; // Username/Display name

  @Column({ nullable: true })
  image: string;

  @Column({ nullable: true })
  googleId: string;

  @Column({
    type: "enum",
    enum: ["email", "google", "facebook"],
    default: "email",
  })
  provider: string;

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column("text", { array: true, default: [] })
  permissions: string[];

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: "timestamp", nullable: true })
  lastLoginAt: Date;

  @Column({ type: "varchar", length: 100, nullable: true })
  lastLoginIp: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  lastLoginDevice: string; // mobile/desktop/tablet

  @Column({ type: "varchar", length: 255, nullable: true })
  lastLoginUserAgent: string;

  @Column({ type: "integer", default: 0 })
  totalWatchTime: number; // Total watch time in minutes

  @Column({ type: "text", nullable: true })
  bannedReason: string; // Reason for ban if isActive = false

  @Column({ nullable: true })
  bannedBy: number; // Admin ID who banned the user

  @Column({ type: "timestamp", nullable: true })
  bannedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => Favorite, (favorite) => favorite.user)
  favorites: Favorite[];

  @BeforeInsert()
  async hashPassword() {
    // Only hash password if it exists (not for OAuth users)
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  async comparePassword(attempt: string): Promise<boolean> {
    // OAuth users don't have passwords
    if (!this.password) {
      return false;
    }
    return await bcrypt.compare(attempt, this.password);
  }
}
