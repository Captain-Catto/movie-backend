import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum MediaType {
  MOVIE = "movie",
  TV = "tv",
}

@Index(["tmdbId", "mediaType"], { unique: true })
@Entity("trending")
export class Trending {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tmdbId: number;

  @Column({
    type: "enum",
    enum: MediaType,
  })
  mediaType: MediaType;

  @Column()
  title: string;

  @Column({ type: "text", nullable: true })
  overview: string;

  @Column({ nullable: true })
  posterPath: string;

  @Column({ nullable: true })
  backdropPath: string;

  @Column({ type: "date", nullable: true })
  releaseDate: Date;

  @Column({ type: "decimal", precision: 3, scale: 1, default: 0 })
  voteAverage: number;

  @Column({ default: 0 })
  voteCount: number;

  @Column({ type: "decimal", precision: 10, scale: 4, default: 0 })
  popularity: number;

  @Column("text", { array: true, default: [] })
  genreIds: number[];

  @Column({ nullable: true })
  originalLanguage: string;

  @Column({ default: false })
  adult: boolean;

  @Column({ default: false })
  isHidden: boolean;

  @Column({ type: "text", nullable: true })
  hiddenReason: string;

  @Column({ type: "timestamp", nullable: true })
  hiddenAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  lastUpdated: Date;
}
