import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("sync_settings")
export class SyncSettings {
  @PrimaryColumn({ type: "integer", default: 1 })
  id: number;

  @Column({ type: "integer", default: 500_000 })
  movieCatalogLimit: number;

  @Column({ type: "integer", default: 200_000 })
  tvCatalogLimit: number;

  @Column({ type: "integer", default: 100 })
  trendingCatalogLimit: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
