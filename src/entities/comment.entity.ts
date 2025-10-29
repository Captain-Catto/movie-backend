import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./user.entity";

@Entity("comments")
@Index("idx_comments_movie_created", ["movieId", "createdAt"])
@Index("idx_comments_tv_created", ["tvId", "createdAt"])
@Index("idx_comments_parent_created", ["parentId", "createdAt"])
@Index("idx_comments_user_created", ["userId", "createdAt"])
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column("text")
  content: string;

  @Column({ name: "user_id" })
  userId: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "movie_id", nullable: true })
  movieId: number;

  @Column({ name: "tv_id", nullable: true })
  tvId: number;

  @Column({ name: "parent_id", nullable: true })
  parentId: number;

  @ManyToOne(() => Comment, (comment) => comment.replies, {
    onDelete: "CASCADE",
    nullable: true,
  })
  @JoinColumn({ name: "parent_id" })
  parent: Comment;

  @OneToMany(() => Comment, (comment) => comment.parent)
  replies: Comment[];

  @Column({ name: "is_hidden", default: false })
  isHidden: boolean;

  @Column({ name: "is_deleted", default: false })
  isDeleted: boolean;

  @Column({ name: "hidden_by", nullable: true })
  hiddenBy: number;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "hidden_by" })
  hiddenByUser: User;

  @Column({ name: "hidden_reason", nullable: true })
  hiddenReason: string;

  @Column({ name: "like_count", default: 0 })
  likeCount: number;

  @Column({ name: "dislike_count", default: 0 })
  dislikeCount: number;

  @Column({ name: "reply_count", default: 0 })
  replyCount: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  // Relations for likes
  @OneToMany(() => CommentLike, (like) => like.comment)
  likes: CommentLike[];

  @OneToMany(() => CommentMention, (mention) => mention.comment, {
    cascade: true,
  })
  mentions: CommentMention[];
}

@Entity("comment_likes")
@Index("idx_comment_likes_user", ["userId", "commentId"])
export class CommentLike {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "comment_id" })
  commentId: number;

  @ManyToOne(() => Comment, (comment) => comment.likes, { onDelete: "CASCADE" })
  @JoinColumn({ name: "comment_id" })
  comment: Comment;

  @Column({ name: "user_id" })
  userId: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "is_like" })
  isLike: boolean; // true = like, false = dislike

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}

@Entity("comment_mentions")
@Index("idx_comment_mentions_user", ["mentionedUserId"])
@Index("idx_comment_mentions_comment", ["commentId"])
export class CommentMention {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "comment_id" })
  commentId: number;

  @ManyToOne(() => Comment, (comment) => comment.mentions, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "comment_id" })
  comment: Comment;

  @Column({ name: "mentioned_user_id" })
  mentionedUserId: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "mentioned_user_id" })
  mentionedUser: User;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}

export enum BannedWordSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

export enum BannedWordAction {
  FILTER = "filter", // Replace with ***
  BLOCK = "block", // Prevent comment submission
  FLAG = "flag", // Allow but flag for review
}

@Entity("banned_words")
export class BannedWord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 100 })
  word: string;

  @Column({
    type: "enum",
    enum: BannedWordSeverity,
    default: BannedWordSeverity.MEDIUM,
  })
  severity: BannedWordSeverity;

  @Column({
    type: "enum",
    enum: BannedWordAction,
    default: BannedWordAction.FILTER,
  })
  action: BannedWordAction;

  @Column({ name: "created_by", nullable: true })
  createdBy: number;

  @ManyToOne(() => User, { onDelete: "SET NULL" })
  @JoinColumn({ name: "created_by" })
  creator: User;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}

export enum ReportReason {
  SPAM = "spam",
  HARASSMENT = "harassment",
  INAPPROPRIATE = "inappropriate",
  OTHER = "other",
}

export enum ReportStatus {
  PENDING = "pending",
  REVIEWED = "reviewed",
  RESOLVED = "resolved",
}

@Entity("comment_reports")
@Index("idx_comment_reports_status", ["status"])
export class CommentReport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "comment_id" })
  commentId: number;

  @ManyToOne(() => Comment, { onDelete: "CASCADE" })
  @JoinColumn({ name: "comment_id" })
  comment: Comment;

  @Column({ name: "reporter_id" })
  reporterId: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "reporter_id" })
  reporter: User;

  @Column({
    type: "enum",
    enum: ReportReason,
  })
  reason: ReportReason;

  @Column("text", { nullable: true })
  description: string;

  @Column({
    type: "enum",
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status: ReportStatus;

  @Column({ name: "reviewed_by", nullable: true })
  reviewedBy: number;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "reviewed_by" })
  reviewer: User;

  @Column({ name: "resolved_at", nullable: true })
  resolvedAt: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
