import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("tv_series")
export class TVSeries {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  tmdbId: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  originalTitle: string;

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

  @Column({ nullable: true })
  firstAirDate: Date;

  @Column("text", { array: true, default: [] })
  originCountry: string[];

  @Column({ type: "integer", nullable: true })
  numberOfSeasons: number | null;

  @Column({ type: "integer", nullable: true })
  numberOfEpisodes: number | null;

  @Column({ type: "integer", default: 0 })
  viewCount: number;

  @Column({ type: "integer", default: 0 })
  clickCount: number;

  @Column({ default: false })
  isBlocked: boolean;

  @Column({ type: "text", nullable: true })
  blockReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  lastUpdated: Date;
}
