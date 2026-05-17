# MovieStream Feature Flows

Tài liệu này mô tả luồng chạy chính của các tính năng trong dự án MovieStream. Mục tiêu là giúp người đọc mới nắm được hệ thống chạy như thế nào, dữ liệu đi qua những module nào, API nào liên quan, và điểm cần lưu ý khi vận hành.

## Tổng Quan Kiến Trúc

MovieStream gồm hai phần chính:

- **Frontend:** Next.js app tại `movie-frontend/movie-app`.
- **Backend:** NestJS API tại `movie-backend`.
- **Database:** PostgreSQL, dùng TypeORM entities.
- **External APIs:** TMDB API cho movie/TV/people metadata; Gemini cho chatbot gợi ý phim.
- **Storage:** AWS S3 cho upload video/image/avatar nếu cấu hình.
- **Realtime:** Socket.IO cho notification và admin analytics.

Backend dùng global prefix:

```text
/api
```

Swagger/OpenAPI:

```text
/api-docs
/api-docs-json
/api-docs-login
/api-docs-logout
```

Swagger login dùng credential riêng trong Admin Settings, lưu tại bảng `settings` key `swaggerAuthSettings`.

## Auth & Session Flow

### Mục Tiêu

Xác thực người dùng, admin, viewer và cấp JWT để gọi API cần quyền.

### Backend Components

- Module: `auth.module.ts`
- Controller: `auth.controller.ts`, `admin-auth.controller.ts`
- Service: `auth.service.ts`
- Entity: `User`, `RefreshToken`
- Guards: `JwtAuthGuard`, `RolesGuard`

### Flow Đăng Ký / Đăng Nhập Email

1. Frontend gọi `POST /api/auth/register` hoặc `POST /api/auth/login`.
2. Backend validate DTO và kiểm tra user trong `UserRepository`.
3. Password được so sánh bằng `bcrypt`.
4. Backend tạo:
   - JWT access token.
   - Refresh token lưu DB.
5. Response trả `{ user, token, refreshToken }`.
6. Frontend lưu token và gắn vào `Authorization: Bearer <token>` cho API cần auth.

### Flow Google Login

1. Frontend nhận Google credential.
2. Gọi `POST /api/auth/google`.
3. Backend tạo hoặc tìm user theo Google profile.
4. Backend cấp JWT và refresh token giống email login.

### Admin Login

1. Frontend admin gọi `POST /api/admin/auth/login`.
2. Backend dùng chung `AuthService.login`.
3. Backend chỉ cho role:
   - `viewer`
   - `admin`
   - `super_admin`
4. User thường bị từ chối admin dashboard.

### Refresh Token

1. Frontend gọi `POST /api/auth/refresh`.
2. Backend kiểm tra refresh token trong DB.
3. Nếu token hợp lệ, cấp access token mới.
4. Token bị revoke hoặc expired sẽ bị từ chối.

## Swagger Documentation Flow

### Mục Tiêu

Swagger luôn mở route nhưng chỉ người có credential Swagger mới xem được.

### Backend Components

- File: `main.ts`
- Service: `admin-settings.service.ts`
- Controller: `admin-settings.controller.ts`
- DTO: `SwaggerAuthSettingsDto`
- DB key: `settings.swaggerAuthSettings`

### Flow Cấu Hình Swagger Access

1. Admin vào frontend:

```text
/admin/settings
```

2. Section **Swagger Access** gọi:

```text
GET /api/admin/settings/swagger-auth
PUT /api/admin/settings/swagger-auth
```

3. Backend lưu:
   - `username`
   - `passwordHash`
   - `updatedAt`

4. Password được hash bằng `bcrypt`, không trả plain text ra API.

### Flow Login Swagger

1. Người dùng mở:

```text
https://api-movie.lequangtridat.com/api-docs
```

2. Nếu chưa có cookie Swagger session, backend redirect:

```text
/api-docs-login
```

3. User nhập Swagger username/password.
4. Backend so sánh password với hash trong DB.
5. Nếu đúng, backend set cookie httpOnly:

```text
ms_swagger_session
```

6. Backend redirect về `/api-docs`.
7. `/api-docs-json` cũng yêu cầu session cookie này.

### Lưu Ý

Swagger login chỉ cho phép xem docs. Muốn test API có guard trong Swagger UI vẫn cần:

1. Gọi `POST /api/auth/login` hoặc `POST /api/admin/auth/login`.
2. Copy JWT.
3. Bấm **Authorize** trong Swagger UI.
4. Paste JWT bearer token.

## Movie Catalog Flow

### Mục Tiêu

Hiển thị danh sách phim, chi tiết phim, credits, videos và recommendations.

### Backend Components

- Module: `movie.module.ts`
- Controller: `movie.controller.ts`
- Service: `movie.service.ts`
- External: `tmdb.service.ts`
- Entities: `Movie`, `SyncStatus`, `ContentTranslation`

### List Movies

Frontend gọi các endpoint:

```text
GET /api/movies
GET /api/movies/now-playing
GET /api/movies/popular
GET /api/movies/top-rated
GET /api/movies/upcoming
```

Flow:

1. Controller nhận query `page`, `limit`, `language`, filters.
2. `MovieService` query DB trước.
3. Nếu page trống hoặc sync status stale, service có thể trigger on-demand sync từ TMDB.
4. Data được chuẩn hóa thành response model cho frontend.
5. Nếu language khác `en-US`, service merge translation từ `content_translations` hoặc fetch TMDB translation khi cần.

### Movie Detail

Frontend route:

```text
/movie/:tmdbId
```

Backend API:

```text
GET /api/movies/:id?language=vi-VN
```

Flow:

1. Backend tìm movie theo `tmdbId` trong DB.
2. Nếu không có hoặc thiếu metadata quan trọng, backend fetch TMDB.
3. Backend lưu/update DB.
4. Backend merge translation theo `language`.
5. Response trả poster/backdrop URLs, title, overview, genres, rating.

### Movie Credits

```text
GET /api/movies/:id/credits
```

Flow:

1. Backend gọi `MovieService.findByTmdbIdWithCredits`.
2. Service lấy details + credits từ TMDB.
3. Response trả cast, crew, production info, runtime, status.

### Movie Recommendations

```text
GET /api/movies/:id/recommendations
```

Flow:

1. Backend tìm recommendation cache trước.
2. Nếu cache hit, trả cache và update usage stats.
3. Nếu cache miss, fetch TMDB recommendations.
4. Backend lưu recommendation cache async.
5. Response trả danh sách movie recommendations.

## TV Series Flow

### Backend Components

- Module: `tv.module.ts`
- Controller: `tv.controller.ts`
- Service: `tv-series.service.ts`
- Entity: `TVSeries`, `ContentTranslation`

### TV List

```text
GET /api/tv
GET /api/tv/on-the-air
GET /api/tv/popular
GET /api/tv/top-rated
```

Flow tương tự movie catalog:

1. Query DB.
2. Lọc blocked/invalid/missing poster nếu cần.
3. Merge translation theo `language`.
4. Trả pagination.

### TV Detail

Frontend route:

```text
/tv/:tmdbId
```

Backend:

```text
GET /api/tv/:id?language=vi-VN
```

Flow:

1. Tìm TV trong DB.
2. Nếu metadata thiếu hoặc stale, fetch TMDB enhanced details.
3. Update DB.
4. Merge translation.
5. Trả seasons, episodes count, status, creators, poster/backdrop.

### TV Season Episodes

```text
GET /api/tv/:id/season/:seasonNumber/episodes
```

Flow:

1. Backend gọi TMDB season endpoint.
2. Trả danh sách episodes cho season.

### TV Recommendations

```text
GET /api/tv/:id/recommendations
```

Flow giống movie recommendations nhưng `contentType = tv`.

## Trending Flow

### Backend Components

- Module: `trending.module.ts`
- Controller: `trending.controller.ts`
- Service: `trending.service.ts`
- Entity: `Trending`

### Home Hero / Trending Page

Frontend dùng trending cho:

```text
/
/trending
```

Backend:

```text
GET /api/trending
```

Flow:

1. Backend query bảng `trending`.
2. Lọc content hidden, thiếu poster, hoặc invalid.
3. Trả movie/TV mixed list.
4. Frontend map `mediaType` để link đúng:
   - movie -> `/movie/:tmdbId`
   - tv -> `/tv/:tmdbId`

### Sync Trending

Admin manual sync:

```text
POST /api/admin/sync
```

Internal maintenance route cũng tồn tại nhưng đã bị ẩn khỏi Swagger và guard admin:

```text
POST /api/sync/trending
```

## Search & Recent Search Flow

### Backend Components

- Module: `search.module.ts`
- Controller: `search.controller.ts`
- Service: `search.service.ts`, `recent-search.service.ts`
- Entity: `RecentSearch`

### Search Header

```text
GET /api/search?q=william&type=person
```

Flow:

1. Frontend search modal gửi query.
2. Backend tìm theo type:
   - `movie`
   - `tv`
   - `person`
   - `all`
3. Search people dùng TMDB/person cache khi cần.
4. Response trả mixed results.
5. Frontend route theo result type.

### Recent Search

Authenticated user:

```text
GET /api/search/recent
POST /api/search/recent
DELETE /api/search/recent
DELETE /api/search/recent/:id
```

Flow:

1. Khi user search, frontend lưu query vào recent search.
2. User có thể clear toàn bộ hoặc xóa từng item.
3. Không xóa hard data nếu logic soft-delete được dùng trong service.

## People Flow

### Backend Components

- Module: `people.module.ts`
- Controller: `people.controller.ts`
- Service: `people-cache.service.ts`
- Entities: `PersonCache`, `PersonCreditsCache`

### Popular People

```text
GET /api/people/popular
```

Flow:

1. Backend lấy popular people từ TMDB/cache.
2. Lọc người không có profile path nếu frontend cần.
3. Trả pagination.

### People Search

```text
GET /api/people/search?q=william
```

Flow:

1. Backend search people theo name.
2. Cache person detail/credits khi cần.
3. Frontend hiển thị result type `person`.
4. Click result đi `/people/:id`.

### Person Detail & Credits

```text
GET /api/people/:id
GET /api/people/:id/credits
GET /api/people/:id/credits/paginated
GET /api/people/:id/credits/cast/paginated
GET /api/people/:id/credits/crew/paginated
```

Flow:

1. Backend check person cache.
2. Cache hit thì trả DB.
3. Cache miss thì fetch TMDB.
4. Credits có pagination/filter/sort theo `mediaType` và `sortBy`.

## Favorites Flow

### Backend Components

- Module: `favorite.module.ts`
- Controller: `favorite.controller.ts`
- Service: `favorite.service.ts`
- Entity: `Favorite`

### Add / Remove Favorite

```text
GET /api/favorites
POST /api/favorites
DELETE /api/favorites
GET /api/favorites/ids
GET /api/favorites/check/:contentId/:contentType
```

Flow:

1. User phải có JWT.
2. Frontend gửi `contentId` và `contentType`.
3. Backend upsert/remove favorite theo user.
4. Frontend dùng `/favorites/ids` hoặc `/favorites/check` để render icon favorite nhanh.

## Comments Flow

### Backend Components

- Module: `comment.module.ts`
- Controller: `comment.controller.ts`
- Service: `comment.service.ts`, `content-filter.service.ts`
- Entities: `Comment`, `CommentLike`, `CommentMention`, `CommentReport`, `BannedWord`

### Read Comments

```text
GET /api/comments/movie/:movieId
GET /api/comments/tv/:tvId
GET /api/comments/:id/replies
GET /api/comments/:id
```

Read comments là public.

### Create / Update / Delete

```text
POST /api/comments
PUT /api/comments/:id
DELETE /api/comments/:id
```

Flow:

1. User phải có JWT.
2. Backend lấy `req.user.id`.
3. Service kiểm tra quyền owner/admin nếu sửa/xóa.
4. User activity log được ghi khi cần.

### Like / Report

```text
POST /api/comments/:id/like
POST /api/comments/:id/report
```

Flow:

1. User phải có JWT.
2. Like/dislike cập nhật `CommentLike`.
3. Report tạo `CommentReport`.
4. Admin xử lý report ở admin comment module.

### Maintenance

Các route fix counts tồn tại nhưng hidden khỏi Swagger và yêu cầu admin:

```text
POST /api/comments/fix-reply-counts
POST /api/comments/fix-like-counts
```

## Notification Flow

### Backend Components

- Module: `notification.module.ts`
- Controller: `notification.controller.ts`, `admin-notification.controller.ts`
- Service: `notification.service.ts`
- Gateways: `notification.gateway.ts`
- Entities: `NotificationTemplate`, `UserNotificationState`, `NotificationAnalytics`

### User Notifications

```text
GET /api/notifications
GET /api/notifications/unread-count
GET /api/notifications/stats
PUT /api/notifications/:id/read
PUT /api/notifications/read-all
DELETE /api/notifications/:id
DELETE /api/notifications
```

Flow:

1. User phải có JWT.
2. Backend trả notification state theo user.
3. Realtime gateway gửi event khi có notification mới.
4. User có thể mark read hoặc dismiss.

### Admin Notifications

```text
POST /api/admin/notifications/broadcast
POST /api/admin/notifications/role
POST /api/admin/notifications/user
POST /api/admin/notifications/maintenance
```

Flow:

1. Admin tạo notification template.
2. Backend gửi tới target users/role/all.
3. Notification state được tạo/lưu.
4. Socket gateway push realtime nếu user đang online.

## Analytics Flow

### Backend Components

- Module: `analytics.module.ts`
- Controller: `analytics.controller.ts`, `admin-analytics.controller.ts`
- Service: `analytics.service.ts`, `admin-analytics.service.ts`
- Entity: `ViewAnalytics`
- Gateway: `admin-analytics.gateway.ts`

### Client Tracking

```text
POST /api/analytics/track
```

Flow:

1. Frontend gửi event:
   - view
   - click
   - play
   - complete
2. Backend enrich IP/device/country/user agent.
3. Save vào `view_analytics`.
4. Admin analytics đọc bảng này để build dashboard.

### Admin Analytics

```text
GET /api/admin/analytics/overview
GET /api/admin/analytics/views
GET /api/admin/analytics/most-viewed
GET /api/admin/analytics/clicks
GET /api/admin/analytics/plays
GET /api/admin/analytics/favorites
GET /api/admin/analytics/popular
GET /api/admin/analytics/devices
GET /api/admin/analytics/countries
```

Flow:

1. Admin/viewer gọi API với JWT.
2. Service query analytics theo filter.
3. Viewer có thể xem, nhưng write actions bị interceptor chặn.

## Chatbot Recommendation Flow

### Backend Components

- Module: `chat.module.ts`
- Controller: `chat.controller.ts`, `admin-chat.controller.ts`
- Service: `chat.service.ts`
- Entities: `ChatSession`, `ChatMessage`, `ChatModerationFlag`
- External: Gemini API

### User Chat

```text
POST /api/chat/sessions
GET /api/chat/sessions
GET /api/chat/sessions/:id/messages
POST /api/chat/sessions/:id/messages
```

Flow:

1. User phải login.
2. Frontend tạo/lấy chat session.
3. User gửi message.
4. Backend lưu user message.
5. Backend gom context:
   - favorites
   - view/play history
   - recent searches
   - trending/popular fallback
6. Backend tạo shortlist movie/TV từ DB.
7. Gemini chỉ nhận context đã lọc và shortlist, không nhận token/password/email nhạy cảm.
8. Gemini trả JSON reply/recommendations/follow-up.
9. Backend validate JSON.
10. Nếu Gemini lỗi, backend trả fallback rule-based từ shortlist.
11. Assistant message được lưu DB.

### Moderation

1. User message được check rule-based.
2. Nếu rủi ro, backend tạo `chat_moderation_flags`.
3. Không auto ban user ở v1.
4. Admin xem flags và tự xử lý.

### Admin Chat Review

```text
GET /api/admin/chat/flags
GET /api/admin/chat/sessions/:id
POST /api/admin/chat/flags/:id/resolve
```

Flow:

1. Admin xem flag.
2. Admin đọc session context liên quan.
3. Admin resolve/ignore.
4. Nếu cần ban user, dùng admin user ban endpoint.

## Upload Flow

### Backend Components

- Module: `upload.module.ts`
- Controller: `upload.controller.ts`
- Service: `s3.service.ts`

### Endpoints

```text
POST /api/upload/video
POST /api/upload/avatar
POST /api/upload/image
```

Flow:

1. User phải có JWT.
2. Frontend gửi multipart form-data.
3. Backend validate file.
4. `S3Service` upload file lên S3.
5. Backend trả URL/key.

## Content Lookup & Watch Flow

### Backend Components

- Module: `content.module.ts`
- Controller: `content.controller.ts`
- Service: `content.service.ts`, `stream-embed.service.ts`

### Stream URL

```text
GET /api/content/stream-url/:tmdbId
```

Flow:

1. Frontend watch page gọi API với TMDB ID.
2. Backend build embed URL theo stream domain settings.
3. Trả primary/fallback stream URLs.

### Lookup TMDB

```text
GET /api/content/lookup/tmdb/:tmdbId
```

Flow:

1. Backend tìm movie/TV theo TMDB ID.
2. Nếu tìm được, trả type và redirect URL.
3. Frontend dùng để điều hướng đúng `/movie/:id` hoặc `/tv/:id`.

## SEO & Open Graph Flow

### Backend Components

- Module: `seo.module.ts`
- Controller: `seo.controller.ts`, `admin-seo.controller.ts`
- Service: `admin-seo.service.ts`
- Entity: `SeoMetadata`

### Public SEO Resolve

```text
GET /api/seo/resolve
```

Flow:

1. Frontend page metadata gọi backend resolve SEO.
2. Backend tìm SEO override trong DB.
3. Nếu không có override, frontend dùng fallback từ content detail.
4. OG image có thể đi qua Next route `/api/og` hoặc poster proxy.

### Admin SEO

```text
GET /api/admin/seo
POST /api/admin/seo
PUT /api/admin/seo/:id
DELETE /api/admin/seo/:id
POST /api/admin/seo/:id/toggle
```

Flow:

1. Admin tạo SEO metadata theo page/content.
2. Frontend metadata ưu tiên SEO override.
3. Có endpoint setup defaults và stats.

## Admin Settings Flow

### Backend Components

- Controller: `admin-settings.controller.ts`
- Service: `admin-settings.service.ts`
- Entity: `Setting`

### Settings Groups

```text
GET/PUT /api/admin/settings/registration
GET/PUT /api/admin/settings/effects
GET/PUT /api/admin/settings/stream-domains
GET/PUT /api/admin/settings/swagger-auth
```

Flow:

1. Admin/viewer vào `/admin/settings`.
2. Frontend load các nhóm settings.
3. Viewer có thể xem nhưng write bị `ViewerReadOnlyInterceptor` chặn.
4. Admin/super_admin update settings.
5. Settings lưu JSONB trong bảng `settings`.

## Admin User Management Flow

### Backend Components

- Controller: `admin-user.controller.ts`
- Service: `admin-user.service.ts`
- Entity: `User`, `UserLog`, `ViewAnalytics`

### User Admin APIs

```text
GET /api/admin/users/list
GET /api/admin/users/:id
POST /api/admin/users/ban
POST /api/admin/users/unban/:id
PUT /api/admin/users/:id/role
PUT /api/admin/users/:id
GET /api/admin/users/:id/logs
GET /api/admin/users/:id/activity
GET /api/admin/users/:id/activity-stats
GET /api/admin/users/:id/watch-history
```

Flow:

1. Admin list/filter users.
2. Admin xem profile, activity, logs, watch history.
3. Admin có thể ban/unban/update role.
4. Viewer chỉ xem, write bị read-only interceptor chặn.

### Watch History

1. API query `view_analytics`.
2. Lọc action:
   - view
   - play
   - complete
3. Enrich poster/title/link từ movies hoặc tv_series.
4. Trả list + summary:
   - total views
   - total plays
   - duration
   - last watched

## Sync & Maintenance Flow

### Public Admin Sync

Admin UI dùng:

```text
GET /api/admin/sync/settings
PATCH /api/admin/sync/settings
POST /api/admin/sync
```

Flow:

1. Admin chọn target sync:
   - movies
   - tv
   - trending
   - all
   - today
   - cleanup
2. Backend queue background sync fire-and-forget.
3. Sync settings giới hạn số lượng catalog/cache.

### Internal Maintenance Routes

Các route sau vẫn tồn tại runtime nhưng bị ẩn khỏi Swagger và yêu cầu admin:

```text
POST /api/sync/*
POST /api/daily-sync/*
GET /api/daily-sync/stats
GET/POST /api/recommendations/*
GET /api/people/admin/cache/*
POST /api/comments/fix-*
GET/POST /api/debug/*
```

Chỉ dùng khi cần vận hành/debug trực tiếp.

## Permission Model

### Public

Các API public gồm content list/detail, search, SEO resolve, settings public, comments read.

### Authenticated User

Yêu cầu JWT:

- Favorites
- Notifications
- Chatbot
- Comment create/update/delete/like/report
- Upload
- Recent search management

### Admin / Super Admin

Yêu cầu JWT + role:

- Admin dashboard
- Admin users
- Admin content controls
- Admin settings writes
- Admin sync
- Admin notifications
- Admin comments moderation
- Internal maintenance endpoints

### Viewer

Viewer được vào admin read APIs và Swagger Access nếu được cấu hình, nhưng write actions bị `ViewerReadOnlyInterceptor` chặn bằng fake success response và audit log.

## Response Convention

Hầu hết API trả wrapper:

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {},
  "pagination": {},
  "meta": {}
}
```

Error response thường có:

```json
{
  "success": false,
  "message": "Failed to process request",
  "error": "Error detail"
}
```

## Swagger Coverage

Swagger hiển thị production APIs chính. Các endpoint debug/demo/internal/maintenance được ẩn khỏi Swagger để tránh expose nhầm:

- `debug`
- `demo`
- `sync`
- `daily-sync`
- maintenance cleanup/fix endpoints
- admin promotion endpoint

Các endpoint này nếu còn tồn tại runtime vẫn phải có guard, không dựa vào việc ẩn Swagger để bảo mật.
