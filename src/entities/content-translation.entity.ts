import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from "typeorm";

@Entity("content_translations")
@Unique(["tmdbId", "contentType", "language"])
export class ContentTranslation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tmdbId: number;

  @Column({ type: "varchar", length: 10 })
  contentType: "movie" | "tv";

  @Column({ type: "varchar", length: 10 })
  language: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  title: string;

  @Column({ type: "text", nullable: true })
  overview: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
