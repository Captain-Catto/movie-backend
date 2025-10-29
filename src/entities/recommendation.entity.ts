import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  Index, 
  CreateDateColumn,
  UpdateDateColumn 
} from 'typeorm';

/**
 * Entity lưu trữ recommendations cache
 * Giới hạn tối đa 1000 records cho dự án nhỏ
 * Cache recommendations từ TMDB API để giảm API calls và tăng performance
 */
@Entity('recommendations')
@Index(['contentType', 'contentId'], { unique: false }) // Index để query nhanh
export class Recommendation {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Loại content gốc: 'movie' hoặc 'tv'
   */
  @Column({ length: 10 })
  contentType: string;

  /**
   * TMDB ID của content gốc (movie/tv được user đang xem)
   */
  @Column()
  contentId: number;

  /**
   * Loại content được recommend: 'movie' hoặc 'tv'
   */
  @Column({ length: 10 })
  recommendedContentType: string;

  /**
   * TMDB ID của content được recommend
   */
  @Column()
  recommendedContentId: number;

  /**
   * Cache toàn bộ data từ TMDB API (title, poster, overview, etc.)
   * Lưu dạng JSON để không cần gọi API lại
   */
  @Column({ type: 'json' })
  recommendedContentData: any;

  /**
   * Điểm score/ranking (cao hơn = relevant hơn)
   * Dùng để sort khi hiển thị recommendations
   */
  @Column({ type: 'float', default: 0 })
  score: number;

  /**
   * Số lần recommendation này được hiển thị cho user
   * Dùng để cleanup: xóa những recommendation ít được xem
   */
  @Column({ default: 0 })
  viewCount: number;

  /**
   * Lần cuối recommendation này được access
   * Dùng để cleanup: xóa những recommendation cũ không được xem
   */
  @Column({ type: 'timestamp', nullable: true })
  lastAccessed: Date;

  /**
   * Thời gian tạo record
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * Lần cuối sync data từ TMDB
   * Để biết khi nào cần refresh cache
   */
  @UpdateDateColumn()
  lastSynced: Date;
}