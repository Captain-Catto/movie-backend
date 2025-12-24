# Search and Sync Flows

Flows for search, lazy/on-demand sync, and scheduled/manual TMDB sync.

## Scope and files

- Backend: controllers `search.controller.ts`, `sync.controller.ts`, `daily-sync.controller.ts`, `admin-sync.controller.ts`; services `search.service.ts`, `data-sync.service.ts`, `daily-sync.service.ts`, `catalog-cleanup.service.ts`; task `data-sync.task.ts`.
- Frontend: search UI/pages calling `/api/search`; no special client logic for sync beyond calling admin endpoints when permitted.

## Search flow (user)

1) User enters query; client calls `GET /api/search` with `type=multi|movie|tv`, pagination, filters.
2) Backend checks cache/DB; if needed, fetches from TMDB respecting `TMDB_MAX_PAGES`.
3) Results returned; client renders.
4) If authenticated, recent searches can be saved and listed via recent search endpoints.

## Lazy/on-demand sync (catalog lists)

1) Client requests list (movies/tv/trending).
2) If DB lacks the requested page, service fetches from TMDB, stores in DB, returns data.
3) Response includes flag `isOnDemandSync`; service may prefetch next page.

## Scheduled popular sync

- Cron at `03:00 UTC`: sync popular movies, popular TV, trending; then cleanup to enforce catalog size limits from env.

## Manual sync endpoints (admin/internal)

- `/api/sync/movies|tv|trending|all?language=xx`
- `/api/daily-sync/{movies|tv|all}?date=YYYY-MM-DD`
- `/api/daily-sync/today`
- `/api/daily-sync/stats`

Flow:
1) Admin triggers endpoint.
2) Backend pulls TMDB data or daily exports, stores to DB.
3) Cleanup job may run depending on service logic.

## Configuration notes

- Env: `TMDB_API_KEY`, `TMDB_BASE_URL`, catalog limits, `TMDB_MAX_PAGES`.
- Daily sync requires network access to TMDB exports; files are time-limited.

## Error handling

- Enforce page limits to avoid TMDB errors.
- Guard or restrict manual sync endpoints in production (currently unguarded).
