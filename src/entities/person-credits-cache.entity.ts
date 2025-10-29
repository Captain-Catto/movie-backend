import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  Index, 
  CreateDateColumn,
  UpdateDateColumn 
} from 'typeorm';

/**
 * Entity lưu trữ cache cho person credits (filmography)
 * Cache toàn bộ credits data để support pagination và sorting
 * Strategy: Cache full credits data, perform pagination in-memory
 */
@Entity('person_credits_cache')
@Index(['personTmdbId'], { unique: true }) // Unique index cho Person TMDB ID
@Index(['lastAccessed'], { unique: false }) // Index để cleanup
export class PersonCreditsCache {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * TMDB ID của person
   */
  @Column({ unique: true })
  personTmdbId: number;

  /**
   * Cache toàn bộ credits từ TMDB API
   * Bao gồm: cast array, crew array với full details
   * Format: { cast: [...], crew: [...] }
   */
  @Column({ type: 'json' })
  creditsData: any;

  /**
   * Metadata về credits để filtering và sorting
   * Format: { 
   *   totalCredits: number,
   *   latestReleaseDate: string,
   *   departments: string[],
   *   mediaTypes: { movie: number, tv: number }
   * }
   */
  @Column({ type: 'json' })
  creditsMetadata: any;

  /**
   * Số lần credits cache này được access
   * Dùng để cleanup: xóa những credits ít được xem
   */
  @Column({ default: 0 })
  viewCount: number;

  /**
   * Lần cuối credits cache này được access
   * Dùng để cleanup: xóa những credits cũ không được xem
   */
  @Column({ type: 'timestamp', nullable: true })
  lastAccessed: Date;

  /**
   * Tổng số lượng credits (cast + crew) để quick reference
   */
  @Column({ default: 0 })
  totalCreditsCount: number;

  /**
   * Release date mới nhất trong credits để sorting
   * Dùng để show những person có hoạt động gần đây nhất
   */
  @Column({ type: 'date', nullable: true })
  latestReleaseDate: Date;

  /**
   * Thời gian tạo cache record
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * Lần cuối sync credits từ TMDB
   * Để biết khi nào cần refresh cache (ví dụ: >3 ngày cho active actors)
   */
  @UpdateDateColumn()
  lastSynced: Date;
}