import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity("settings")
@Index("idx_settings_key", ["key"], { unique: true })
export class Setting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 100, unique: true })
  key: string;

  @Column({ type: "jsonb" })
  value: Record<string, any>;

  // Use lowercase column names to match existing migration
  @CreateDateColumn({ name: "createdat" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updatedat" })
  updatedAt: Date;
}
