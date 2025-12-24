# Analytics and Dashboard Flows

Flows for admin analytics and dashboard data retrieval.

## Scope and files

- Backend: `movie-backend/src/controllers/admin-analytics.controller.ts`, `src/controllers/admin-dashboard.controller.ts`, services `admin-analytics.service.ts`, `admin-dashboard.service.ts`, entities `view-analytics.entity.ts`, `user-activity.entity.ts`, `notification-analytics.entity.ts`.
- Frontend: admin analytics/dashboard pages consuming these endpoints.

## Flows

### Dashboard overview
1) Admin calls dashboard endpoint (check controller routes under `/api/admin/dashboard`).
2) Backend aggregates stats (users, content, activity) and returns overview cards/graphs.

### Analytics data
1) Admin requests analytics endpoints for views, clicks, favorites, devices, countries, popular content.
2) Backend queries analytics tables and returns datasets suitable for charts.

### Notifications analytics
1) Admin calls analytics endpoints for notification performance (sends, reads, unread).
2) Backend returns counts/time series for charting.

## Client handling (suggested)

- Use caching/memoization per filter/time range to reduce load.
- Handle loading/error states per widget.
- Allow time range filters; pass to API if supported.

## Notes

- Ensure admin routes are role-guarded.
- If adding new metrics, extend entities/services and update dashboard wiring on frontend.
