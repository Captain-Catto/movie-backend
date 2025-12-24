# Backend features

This document outlines the key capabilities of `movie-backend` based on the current modules/controllers/services.

## Architecture overview

- Framework: NestJS (global prefix `api`)
- Database: PostgreSQL + TypeORM
- External: TMDB API (metadata), AWS S3 (uploads)
- Realtime: Socket.IO notifications gateway
- Scheduling: cron via `@nestjs/schedule`

## Features by module

### 1) Catalog for movies and TV series

Goal: paginated, filtered lists and popular feeds.

- Movies
  - Filters: `genres`, `year`, `countries`, `sortBy`, `language`, `page`, `limit`
  - Feeds: now-playing, popular, top-rated, upcoming
  - Detail by TMDB ID
  - Credits, videos, recommendations from TMDB

- TV series
  - Filters: `genres`, `year`, `countries`, `sortBy`, `language`, `page`, `limit`
  - Feeds: on-the-air, popular-tv, top-rated-tv
  - Detail by TMDB ID
  - Credits, videos, recommendations from TMDB

In code: `movie.controller.ts`, `tv.controller.ts`, `movie-detail.controller.ts`; services `movie.service.ts`, `tv-series.service.ts`.

### 2) TMDB sync modes

Goal: balance speed and completeness.

1) Popular sync (scheduled)
   - Cron at `03:00 UTC`
   - Sync popular movies/TV and trending
   - Cleanup catalog size by env limits

2) Lazy-loading (on-demand)
   - When list data is missing in DB, fetch TMDB, store, return data
   - Response flag `isOnDemandSync`; prefetch next page in background

3) Manual sync endpoints
   - `/api/sync/*` for movies/tv/trending/all per language

4) Daily export sync
   - `/api/daily-sync/*` for TMDB daily exports (movies/tv/all/today) with stats

In code: controllers `sync.controller.ts`, `daily-sync.controller.ts`, `admin-sync.controller.ts`; task/service `data-sync.task.ts`, `data-sync.service.ts`, `daily-sync.service.ts`, `catalog-cleanup.service.ts`. See `docs/README_DAILY_SYNC.md`.

### 3) Search

Goal: search movie/tv/multi and track recent searches.

- `GET /api/search`
  - `type=multi|movie|tv`
  - Enforces TMDB page limit (`TMDB_MAX_PAGES`)
- Recent searches (JWT)
  - List history
  - Save query
  - Delete all/by id

In code: `search.controller.ts`; services `search.service.ts`, `recent-search.service.ts`; repo `recent-search.repository.ts`.

### 4) People with cache

Goal: reduce TMDB calls by caching person details/credits; provide maintenance tools.

- Public
  - Popular people from TMDB
  - Person details (prefer cache)
  - Credits from TMDB; paginated endpoints over cache
- Maintenance (unguarded in current code)
  - Cache stats
  - Cleanup (light/major)
  - Force refresh by person id

In code: `people.controller.ts`; services `people-cache.service.ts`, `tmdb.service.ts`; repo `people-cache.repository.ts`.

### 5) Authentication, refresh, authorization

Goal: email/password login, Google payload login, JWT protection, admin roles.

- Auth endpoints
  - Register, login (email/password)
  - Google auth (payload)
  - Refresh access token
  - Logout (can revoke refresh token)
  - Me (profile from JWT)

- Admin auth
  - Admin login checks `admin` or `super_admin`
  - Promote via `ADMIN_PROMOTION_SECRET`

- Authorization
  - JWT guard: `JwtAuthGuard`
  - Roles guard + decorator: `@Roles(...)`

- Viewer role (read-only)
  - User role enum includes `viewer`
  - `ViewerReadOnlyInterceptor` blocks POST/PUT/PATCH/DELETE for viewer, returns fake success, logs to `viewer_audit_logs`
  - Table `viewer_audit_logs` via migration `016_create_viewer_audit_logs.sql`

In code: controllers `auth.controller.ts`, `admin-auth.controller.ts`; auth `jwt-auth.guard.ts`, `jwt.strategy.ts`; guards/decorators `roles.guard.ts`, `roles.decorator.ts`, `get-user.decorator.ts`; entities `user.entity.ts`, `refresh-token.entity.ts`.

### 6) Favorites

Goal: per-user favorites and optimized endpoints.

- CRUD (JWT)
  - List favorites with pagination
  - Add/remove by `contentId` + `contentType` (movie|tv)
- Optimized
  - Get favorite IDs (lightweight)
  - Fast existence check

In code: `favorite.controller.ts`, `favorite.service.ts`, `favorite.repository.ts`, entity `favorite.entity.ts`.

### 7) Comments, mentions, reports, moderation

Goal: comments for movie/tv, replies, likes/dislikes, reports, and admin moderation.

- User (JWT)
  - List comments by movie or tv
  - List replies
  - Create/edit/delete
  - Like/dislike
  - Report
  - List own comments
  - Stats per movie/tv
  - Mention search
  - Content filter checks
  - Maintenance tools for counters

- Admin (JWT + role)
  - List comments/reported
  - Hide/unhide/delete
  - Resolve report
  - Manage banned words
  - Bulk hide/delete
  - Analyze comment
  - Overview stats

In code: controllers `comment.controller.ts`, `admin-comment.controller.ts`; services `comment.service.ts`, `content-filter.service.ts`; repo `comment.repository.ts`; entities for likes/mentions/reports/banned words.

### 8) Notifications (DB + realtime)

Goal: store notifications, manage read/unread, and push realtime.

- User (JWT)
  - List notifications
  - Unread count
  - User stats
  - Mark-as-read / mark-all-read

- Admin (JWT + role)
  - Broadcast (all)
  - By role
  - By user
  - Maintenance notification
  - History + stats
  - Delete notification

- Realtime
  - Socket.IO namespace `/notifications`
  - Client sends token on connect
  - Server pushes new notification and unread count

In code: controllers `notification.controller.ts`, `admin-notification.controller.ts`; gateway `notification.gateway.ts`; services/repos `notification.service.ts`, `notification.repository.ts`. See `docs/NOTIFICATION_SETUP.md`.

### 9) SEO metadata and content control

Goal: manage SEO metadata per page type and control content visibility.

- SEO (admin)
  - CRUD SEO metadata
  - Fetch by `pageType`
  - Toggle active/inactive
  - Create defaults and stats

- Content control (admin)
  - Block/unblock by `contentId` + `contentType`
  - List by status and search
  - Hide/unhide trending by `tmdbId` + `mediaType`
  - Content stats

In code: controllers `admin-seo.controller.ts`, `admin-content.controller.ts`; services `admin-seo.service.ts`, `admin-content.service.ts`; entities `seo-metadata.entity.ts`, `content-control.entity.ts`.

### 10) Upload video/avatar to S3

Goal: upload media and return URL/key.

- Video: `POST /api/upload/video` (field `video`, 500MB, video mimetype)
- Avatar: `POST /api/upload/avatar` (field `avatar`, 5MB, image mimetype, JWT). After upload, client calls `PUT /api/auth/profile` with `image`.
- AWS SDK v3 to S3, sanitized filenames, returns URL/key

In code: controller `upload.controller.ts`; service `s3.service.ts`.

### 11) Analytics and admin dashboard

Goal: system metrics for admin.

- Analytics (admin)
  - Overview
  - Views and most-viewed
  - Clicks
  - Favorites
  - Popular content
  - Devices and countries

- Dashboard (admin)
  - Overview stats
  - User growth
  - Content-by-month

In code: controllers `admin-analytics.controller.ts`, `admin-dashboard.controller.ts`; services `admin-analytics.service.ts`, `admin-dashboard.service.ts`; entities `view-analytics.entity.ts`, `user-activity.entity.ts`, `notification-analytics.entity.ts`.

## Env configuration

Common vars:

- Database: `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `DATABASE_NAME`
- JWT: `JWT_SECRET`, `JWT_EXPIRES_IN`
- TMDB: `TMDB_API_KEY`, `TMDB_BASE_URL`
- App: `PORT`, `NODE_ENV`
- TypeORM: `TYPEORM_SYNCHRONIZE`, `TYPEORM_LOGGING`, `DB_POOL_MAX`, `DB_POOL_MIN`
- Upload S3 (optional): `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET_NAME`
- Catalog limits (optional): `MOVIE_CATALOG_LIMIT`, `TV_CATALOG_LIMIT`
- Admin promotion (optional): `ADMIN_PROMOTION_SECRET`

## Security notes for public API

Some maintenance/debug endpoints are unguarded in current code (e.g., `/api/sync/*`, `/api/daily-sync/*`, `/api/recommendations/*`, `/api/people/admin/cache/*`, `/api/debug/*`, `/api/demo/*`).

If exposing publicly:

- Guard these endpoints or restrict via network policy (allowlist/VPN/internal).
- Disable `TYPEORM_SYNCHRONIZE` in production and use migrations.
