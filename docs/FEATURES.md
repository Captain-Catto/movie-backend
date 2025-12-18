# Tính năng backend

Tài liệu này mô tả các tính năng chính của backend `movie-backend` dựa trên các module/controller/service hiện có trong codebase.

## Tổng quan kiến trúc

- Framework: NestJS, global prefix `api`
- Database: PostgreSQL + TypeORM
- Tích hợp bên ngoài: TMDB API (metadata), AWS S3 (upload)
- Realtime: Socket.IO gateway cho notifications
- Scheduling: cron jobs bằng `@nestjs/schedule`

## Nhóm tính năng theo module

### 1) Catalog phim và TV series

Mục tiêu: cung cấp danh sách nội dung có phân trang, filter và các feed phổ biến để phục vụ UI.

- Movies
  - Danh sách có filter: `genres`, `year`, `countries`, `sortBy`, `language`, `page`, `limit`
  - Các feed: now-playing, popular, top-rated, upcoming
  - Chi tiết theo TMDB ID (đóng vai trò identifier chính ở nhiều endpoint)
  - Credits, videos và recommendations lấy từ TMDB

- TV series
  - Danh sách có filter: `genres`, `year`, `countries`, `sortBy`, `language`, `page`, `limit`
  - Các feed: on-the-air, popular-tv, top-rated-tv
  - Chi tiết theo TMDB ID
  - Credits, videos và recommendations lấy từ TMDB

Liên quan trong code:

- Controllers: `src/controllers/movie.controller.ts`, `src/controllers/tv.controller.ts`, `src/controllers/movie-detail.controller.ts`
- Services: `src/services/movie.service.ts`, `src/services/tv-series.service.ts`

### 2) Cơ chế đồng bộ dữ liệu từ TMDB

Backend hỗ trợ nhiều cách đồng bộ để cân bằng giữa tốc độ phản hồi và độ đầy đủ dữ liệu.

1) Popular sync (scheduled job)

- Chạy cron mỗi ngày lúc `03:00` theo `UTC`.
- Sync popular movies, popular TV series và trending.
- Sau sync sẽ chạy cleanup để giới hạn kích thước catalog theo biến môi trường.
- Mục tiêu: đảm bảo luôn có một tập dữ liệu “nóng” sẵn trong DB.

2) Lazy-loading cho danh sách (on-demand sync)

- Khi gọi danh sách (movies/tv) mà trang chưa có dữ liệu trong DB, service sẽ tự gọi TMDB để sync trang đó, lưu vào DB, rồi trả dữ liệu cho client.
- Kết quả trả về có cờ `isOnDemandSync` để frontend biết dữ liệu vừa được lazy-load.
- Có cơ chế prefetch trang kế tiếp chạy nền để cải thiện UX.

3) Sync endpoints (manual)

- Nhóm endpoint `/api/sync/*` để trigger sync nhanh theo `language` (movies, tv, trending, all).

4) Daily export sync (manual)

- Nhóm endpoint `/api/daily-sync/*` để đồng bộ theo file daily exports của TMDB (movies/tv/all/today) và xem thống kê.

Liên quan trong code:

- Controllers: `src/controllers/sync.controller.ts`, `src/controllers/daily-sync.controller.ts`, `src/controllers/admin-sync.controller.ts`
- Task: `src/tasks/data-sync.task.ts`
- Services: `src/services/data-sync.service.ts`, `src/services/daily-sync.service.ts`, `src/services/catalog-cleanup.service.ts`
- Tài liệu chi tiết: `docs/README_DAILY_SYNC.md`

### 3) Search

Mục tiêu: tìm kiếm nội dung (movie/tv/multi) và lưu lịch sử tìm kiếm theo user.

- `GET /api/search`
  - Hỗ trợ `type=multi|movie|tv`
  - Kiểm soát giới hạn page theo giới hạn TMDB (`TMDB_MAX_PAGES`)
- Recent searches (JWT required)
  - Lấy danh sách lịch sử tìm kiếm
  - Lưu query mới và xoá lịch sử (toàn bộ hoặc theo id)

Liên quan trong code:

- Controller: `src/controllers/search.controller.ts`
- Services: `src/services/search.service.ts`, `src/services/recent-search.service.ts`
- Repositories: `src/repositories/recent-search.repository.ts`

### 4) People (person details và credits) kèm cache

Mục tiêu: giảm số lần gọi TMDB bằng cách cache person details/credits trong DB, đồng thời có công cụ bảo trì cache.

- Public
  - Popular people (lấy trực tiếp từ TMDB)
  - Person details (ưu tiên cache)
  - Credits (lấy từ TMDB) và các endpoint phân trang dựa trên cache
- Maintenance endpoints (hiện đang không có guard)
  - Thống kê cache
  - Cleanup cache (light/major)
  - Force refresh cache theo person id

Liên quan trong code:

- Controller: `src/controllers/people.controller.ts`
- Services: `src/services/people-cache.service.ts`, `src/services/tmdb.service.ts`
- Repositories: `src/repositories/people-cache.repository.ts`

### 5) Authentication, refresh token và phân quyền

Mục tiêu: hỗ trợ đăng nhập email/password, đăng nhập bằng Google payload, bảo vệ endpoint bằng JWT, phân quyền admin.

- Auth endpoints
  - Register (email/password)
  - Login (email/password)
  - Google auth (nhận payload từ client)
  - Refresh access token bằng refresh token
  - Logout (có thể revoke refresh token nếu gửi kèm)
  - Me (lấy profile từ JWT)

- Admin auth
  - Admin login: kiểm tra role `admin` hoặc `super_admin`
  - Promote endpoint: cho phép nâng quyền theo `ADMIN_PROMOTION_SECRET`

- Authorization
  - JWT guard cho endpoint cần đăng nhập: `JwtAuthGuard`
  - Roles guard + decorator `@Roles(...)` cho admin routes

Liên quan trong code:

- Controllers: `src/controllers/auth.controller.ts`, `src/controllers/admin-auth.controller.ts`
- Auth: `src/auth/jwt-auth.guard.ts`, `src/auth/jwt.strategy.ts`
- Guards/Decorators: `src/guards/roles.guard.ts`, `src/decorators/roles.decorator.ts`, `src/decorators/get-user.decorator.ts`
- Entity: `src/entities/user.entity.ts`, `src/entities/refresh-token.entity.ts`

### 6) Favorites

Mục tiêu: lưu danh sách nội dung yêu thích của từng user và cung cấp endpoint tối ưu cho UI.

- CRUD theo user (JWT required)
  - List favorites có phân trang
  - Add/remove favorite theo `contentId` + `contentType` (movie|tv)
- Endpoint tối ưu
  - Lấy danh sách favorite IDs (nhẹ, phục vụ initial load)
  - Check nhanh một item có trong favorites hay không

Liên quan trong code:

- Controller: `src/controllers/favorite.controller.ts`
- Service: `src/services/favorite.service.ts`
- Repository: `src/repositories/favorite.repository.ts`
- Entity: `src/entities/favorite.entity.ts`

### 7) Comments, mention, report và moderation

Mục tiêu: hệ thống bình luận theo movie/tv, có reply, tương tác (like/dislike), báo cáo vi phạm, và công cụ moderation cho admin.

- User features (JWT required)
  - Lấy comment theo movie hoặc tv
  - Lấy replies
  - Tạo/sửa/xoá comment
  - Like/dislike comment
  - Report comment
  - Lấy comment của chính user
  - Thống kê comment theo movie/tv
  - Tìm user để mention
  - Kiểm tra nội dung theo content filter
  - Maintenance tools để fix reply/like counters

- Admin moderation (JWT + role required)
  - Danh sách comment, danh sách reported
  - Ẩn/hiện, xoá comment
  - Resolve report
  - Quản lý banned words (list/create/delete)
  - Bulk hide / bulk delete
  - Analyze comment
  - Thống kê overview

Liên quan trong code:

- Controllers: `src/controllers/comment.controller.ts`, `src/controllers/admin-comment.controller.ts`
- Service/Filter: `src/services/comment.service.ts`, `src/services/content-filter.service.ts`
- Repository: `src/repositories/comment.repository.ts`
- Entities: `src/entities/comment.entity.ts` và các entity liên quan đến like/mention/report/banned words

### 8) Notifications (DB + realtime)

Mục tiêu: lưu notification vào DB, quản lý trạng thái read/unread, và đẩy realtime qua Socket.IO.

- User notifications (JWT required)
  - Danh sách notifications theo user
  - Unread count
  - Stats theo user
  - Mark-as-read và mark-all-read

- Admin notifications (JWT + role required)
  - Gửi broadcast (all)
  - Gửi theo role
  - Gửi theo user
  - Maintenance notification
  - Lịch sử đã gửi + thống kê
  - Xoá notification

- Realtime
  - Socket.IO namespace `/notifications`
  - Client gửi token (auth) khi connect
  - Server push event notification mới và cập nhật unread count

Liên quan trong code:

- Controllers: `src/controllers/notification.controller.ts`, `src/controllers/admin-notification.controller.ts`
- Gateway: `src/gateways/notification.gateway.ts`
- Service/Repo: `src/services/notification.service.ts`, `src/repositories/notification.repository.ts`
- Tài liệu chi tiết: `docs/NOTIFICATION_SETUP.md`

### 9) SEO metadata và content control

Mục tiêu: quản lý metadata SEO theo từng loại trang, và kiểm soát nội dung hiển thị (block/unblock).

- SEO metadata (admin)
  - CRUD SEO metadata
  - Lấy theo `pageType`
  - Toggle trạng thái active/inactive
  - Tạo default entries và thống kê

- Content control (admin)
  - Block/unblock nội dung theo `contentId` + `contentType`
  - Danh sách nội dung theo trạng thái và search
  - Ẩn/hiện trending theo `tmdbId` + `mediaType`
  - Thống kê content

Liên quan trong code:

- Controllers: `src/controllers/admin-seo.controller.ts`, `src/controllers/admin-content.controller.ts`
- Services: `src/services/admin-seo.service.ts`, `src/services/admin-content.service.ts`
- Entities: `src/entities/seo-metadata.entity.ts`, `src/entities/content-control.entity.ts`

### 10) Upload video lên S3

Mục tiêu: upload video file và trả về URL/key để frontend lưu tham chiếu.

- Endpoint `POST /api/upload/video`
- Upload bằng `multer` với:
  - Field name: `video`
  - Giới hạn dung lượng: 500MB
  - Chỉ chấp nhận mimetype bắt đầu bằng `video/`
- Backend dùng AWS SDK để upload lên S3

Liên quan trong code:

- Controller: `src/controllers/upload.controller.ts`
- Service: `src/services/s3.service.ts`

### 11) Analytics và admin dashboard

Mục tiêu: cung cấp số liệu tổng quan để admin theo dõi hệ thống.

- Analytics (admin)
  - Overview
  - Views và most-viewed content
  - Clicks
  - Favorites
  - Popular content
  - Devices và countries

- Dashboard (admin)
  - Stats tổng quan
  - User growth
  - Content-by-month

Liên quan trong code:

- Controllers: `src/controllers/admin-analytics.controller.ts`, `src/controllers/admin-dashboard.controller.ts`
- Services: `src/services/admin-analytics.service.ts`, `src/services/admin-dashboard.service.ts`
- Entities liên quan: `src/entities/view-analytics.entity.ts`, `src/entities/user-activity.entity.ts`, `src/entities/notification-analytics.entity.ts`

## Cấu hình liên quan (env)

Các biến môi trường hay dùng:

- Database: `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `DATABASE_NAME`
- JWT: `JWT_SECRET`, `JWT_EXPIRES_IN`
- TMDB: `TMDB_API_KEY`, `TMDB_BASE_URL`
- App: `PORT`, `NODE_ENV`
- TypeORM: `TYPEORM_SYNCHRONIZE`, `TYPEORM_LOGGING`, `DB_POOL_MAX`, `DB_POOL_MIN`
- Upload S3 (optional): `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET_NAME`
- Catalog limits (optional): `MOVIE_CATALOG_LIMIT`, `TV_CATALOG_LIMIT`
- Admin promotion (optional): `ADMIN_PROMOTION_SECRET`

## Lưu ý bảo mật khi public API

Trong code hiện tại có một số endpoint phục vụ maintenance/debug không có guard (ví dụ: `/api/sync/*`, `/api/daily-sync/*`, `/api/recommendations/*`, `/api/people/admin/cache/*`, `/api/debug/*`, `/api/demo/*`).

Khuyến nghị nếu backend public ra Internet:

- Bảo vệ các endpoint này bằng guard hoặc giới hạn truy cập bằng network policy (IP allowlist, VPN, internal routing).
- Tắt `TYPEORM_SYNCHRONIZE` trên production và dùng migrations.
