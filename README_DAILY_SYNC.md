# TMDB Daily Sync Script

Script để đồng bộ hóa toàn bộ dữ liệu từ TMDB Daily ID Exports vào cơ sở dữ liệu PostgreSQL.

## Tổng quan

TMDB cung cấp các file export hàng ngày chứa danh sách ID của tất cả nội dung hợp lệ trong cơ sở dữ liệu của họ. Script này tự động tải xuống và xử lý các file này để cập nhật database một cách hiệu quả.

### Tính năng chính:

- ✅ Tải xuống và parse file TMDB daily exports (.json.gz)
- ✅ Xử lý batch với rate limiting để tránh bị TMDB chặn
- ✅ Đồng bộ movies và TV series song song
- ✅ Bỏ qua nội dung adult (có thể cấu hình)
- ✅ Progress tracking và error handling chi tiết
- ✅ CLI command và REST API endpoints
- ✅ Retry mechanism cho API calls

## Cài đặt

Script đã được tích hợp sẵn vào backend NestJS. Không cần cài đặt thêm packages.

## Sử dụng

### 1. Qua CLI Command

```bash
# Sync tất cả dữ liệu cho ngày 4/9/2025
npm run cli daily-sync -- --date 2025-09-04 --type all

# Chỉ sync movies
npm run cli daily-sync -- --date 2025-09-04 --type movies --batch-size 50

# Chỉ sync TV series
npm run cli daily-sync -- --date 2025-09-04 --type tv

# Sync cho ngày hôm nay
npm run cli daily-sync
```

### 2. Qua REST API

```bash
# Sync tất cả cho ngày 4/9/2025
POST http://localhost:8080/api/daily-sync/all?date=2025-09-04

# Sync movies
POST http://localhost:8080/api/daily-sync/movies?date=2025-09-04

# Sync TV series
POST http://localhost:8080/api/daily-sync/tv?date=2025-09-04

# Sync cho ngày 4/9/2025 (cố định)
POST http://localhost:8080/api/daily-sync/today

# Xem thống kê
GET http://localhost:8080/api/daily-sync/stats
```

### 3. Sử dụng trực tiếp Service

```typescript
import { DailySyncService } from './services/daily-sync.service';

// Inject service
constructor(private dailySyncService: DailySyncService) {}

// Sync cho ngày 4/9/2025
await this.dailySyncService.syncTodayExports();

// Hoặc sync cho ngày khác
const date = new Date('2025-09-04');
await this.dailySyncService.syncAllFromDailyExport(date);
```

## Cấu hình

### Environment Variables

Đảm bảo các biến môi trường sau được cấu hình trong `.env`:

```env
TMDB_API_KEY=your_tmdb_api_key
TMDB_BASE_URL=https://api.themoviedb.org/3
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=your_username
DATABASE_PASSWORD=your_password
DATABASE_NAME=movie_db
```

### Batch Size

- Default batch size: 100 items
- Có thể điều chỉnh từ 1-1000 items
- Batch size nhỏ hơn = ít RAM hơn nhưng chậm hơn
- Batch size lớn hơn = nhanh hơn nhưng dễ bị rate limit

### Rate Limiting

- Delay giữa API calls: 50ms * index trong batch
- Delay giữa batches: 1 giây
- Retry cho rate limit (429): exponential backoff
- Max retries: 3 lần

## Cách thức hoạt động

### 1. Tải Daily Exports

```
http://files.tmdb.org/p/exports/movie_ids_09_04_2025.json.gz
http://files.tmdb.org/p/exports/tv_series_ids_09_04_2025.json.gz
```

### 2. Xử lý dữ liệu

- Giải nén file .gz
- Parse từng dòng JSON
- Filter adult content (movies)
- Chia thành batches

### 3. Sync với database

- Call TMDB API để lấy chi tiết
- Upsert vào PostgreSQL
- Track progress và errors

### 4. Format dữ liệu trong daily export

```json
{"id": 123456, "adult": false, "video": false, "popularity": 45.678}
{"id": 789012, "adult": true, "video": false, "popularity": 12.345}
```

## Logs và Monitoring

### Log Levels

- **INFO**: Progress updates, batch completion
- **WARN**: Missing files, failed items
- **ERROR**: Critical errors, API failures

### Log Examples

```
[DailySyncService] Starting movie sync from daily export for Wed Sep 04 2025
[DailySyncService] Downloading daily export from: http://files.tmdb.org/p/exports/movie_ids_09_04_2025.json.gz
[DailySyncService] Successfully downloaded and parsed 425,847 items from daily export
[DailySyncService] Found 398,234 movie IDs (filtered out adult content)
[DailySyncService] Processing movie batch 1/3983 (100 items)
[DailySyncService] Batch completed: 95/100 synced. Total: 95/100
```

### Stats Tracking

```json
{
  "success": true,
  "data": {
    "totalMovies": 425847,
    "totalTVSeries": 168392,
    "lastSyncDate": "2025-09-04T14:30:00.000Z"
  }
}
```

## Troubleshooting

### Lỗi thường gặp

1. **File không tồn tại (404)**
   - TMDB chưa tạo export cho ngày đó
   - Kiểm tra URL format
   - Thử ngày khác

2. **Rate limiting (429)**
   - Script tự động retry
   - Tăng delay giữa requests
   - Giảm batch size

3. **Database connection errors**
   - Kiểm tra PostgreSQL đang chạy
   - Xác thực credentials trong .env

4. **Memory issues**
   - Giảm batch size
   - Increase Node.js memory: `--max-old-space-size=4096`

### Debug Mode

```bash
# Bật debug logging
NODE_ENV=development npm run cli daily-sync -- --date 2025-09-04
```

## Performance

### Estimated Times

- **Movies**: ~400,000 items = 2-3 giờ
- **TV Series**: ~150,000 items = 1-2 giờ
- **Total**: 3-5 giờ cho full sync

### Optimization Tips

1. Chạy song song movies và TV
2. Sử dụng batch size 100-200
3. Chạy trong non-peak hours
4. Monitor database connections

## Lưu ý quan trọng

- ⚠️ File exports chỉ khả dụng trong 3 tháng
- ⚠️ Export job chạy hàng ngày lúc 7:00 AM UTC
- ⚠️ Adult content được filter ra khỏi movies
- ⚠️ Cần TMDB API key hợp lệ
- ⚠️ Database cần đủ dung lượng (~2GB cho full data)

## Support

Nếu gặp vấn đề, kiểm tra:

1. Logs trong console/file
2. TMDB API status
3. Database connections
4. Network connectivity

Hoặc liên hệ qua GitHub issues.