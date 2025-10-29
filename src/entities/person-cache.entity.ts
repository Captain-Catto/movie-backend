import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  Index, 
  CreateDateColumn,
  UpdateDateColumn 
} from 'typeorm';

/**
 * Entity lưu trữ cache cho people details
 * Cache thông tin người từ TMDB API để giảm API calls và tăng performance
 * Scaling strategy: 50k+ records trong ngày, cleanup về 1000 records tốt nhất
 */
@Entity('person_cache')
@Index(['tmdbId'], { unique: true }) // Unique index cho TMDB ID
@Index(['popularity'], { unique: false }) // Index để sort theo popularity
export class PersonCache {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * TMDB ID của person (unique identifier)
   */
  @Column({ unique: true })
  tmdbId: number;

  /**
   * Cache toàn bộ person details từ TMDB API
   * Bao gồm: name, biography, birthday, profile_path, known_for_department, etc.
   */
  @Column({ type: 'json' })
  personData: any;

  /**
   * Popularity score từ TMDB để sorting
   */
  @Column({ type: 'float', default: 0 })
  popularity: number;

  /**
   * Tên person để search và quick reference
   */
  @Column({ length: 255 })
  name: string;

  /**
   * Department chính (Acting, Directing, etc.) để filtering
   */
  @Column({ length: 100, nullable: true })
  knownForDepartment: string;

  /**
   * Số lần person cache này được access
   * Dùng để cleanup: xóa những person ít được xem
   */
  @Column({ default: 0 })
  viewCount: number;

  /**
   * Lần cuối person cache này được access
   * Dùng để cleanup: xóa những person cũ không được xem
   */
  @Column({ type: 'timestamp', nullable: true })
  lastAccessed: Date;

  /**
   * Thời gian tạo cache record
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * Lần cuối sync data từ TMDB
   * Để biết khi nào cần refresh cache (ví dụ: >7 ngày)
   */
  @UpdateDateColumn()
  lastSynced: Date;
}