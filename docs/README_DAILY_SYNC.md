# TMDB Daily Sync

Tài liệu mô tả cơ chế đồng bộ dữ liệu từ TMDB Daily ID Exports vào PostgreSQL.

## Tổng quan

TMDB cung cấp các file export hàng ngày chứa danh sách ID của tất cả nội dung hợp lệ. Backend tải xuống và xử lý các file này để cập nhật database.

## Sử dụng

### Qua REST API

```bash
# Sync tất cả cho ngày 4/9/2025
POST http://localhost:8080/api/daily-sync/all?date=2025-09-04

# Sync movies
POST http://localhost:8080/api/daily-sync/movies?date=2025-09-04

# Sync TV series
POST http://localhost:8080/api/daily-sync/tv?date=2025-09-04

# Sync từ export mới nhất có sẵn
POST http://localhost:8080/api/daily-sync/today

# Xem thống kê
GET http://localhost:8080/api/daily-sync/stats
```

### Sử dụng trực tiếp service (trong code)

```typescript
import { DailySyncService } from "./services/daily-sync.service";

constructor(private dailySyncService: DailySyncService) {}

await this.dailySyncService.syncTodayExports();
```

## Cấu hình

Các biến môi trường tối thiểu:

```env
TMDB_API_KEY=your_tmdb_api_key
TMDB_BASE_URL=https://api.themoviedb.org/3
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=your_username
DATABASE_PASSWORD=your_password
DATABASE_NAME=movie_db
```

## Ghi chú

- File exports chỉ khả dụng trong khoảng thời gian giới hạn (theo TMDB).
- Đồng bộ full catalog có thể mất nhiều giờ tuỳ cấu hình và rate limit.

