# Notifications Feature Flows

End-to-end flows for notifications (frontend + backend).

## Scope and files

- Backend: `movie-backend/src/controllers/notification.controller.ts`, `src/controllers/admin-notification.controller.ts`, `src/gateways/notification.gateway.ts`, `src/services/notification.service.ts`, `src/repositories/notification.repository.ts`, entities under `src/entities/notification*`.
- Frontend: notification service/slice/hooks (check your `movie-frontend/movie-app/src/services` and `src/store`), UI components/pages that show notifications.

## Flows

### User: fetch list and unread count
1) On authenticated load, call `GET /api/notifications` (with pagination) and `GET /api/notifications/unread-count`.
2) Store results in client state; render list and badge.

### User: mark read / mark all read
1) User opens a notification or clicks “Mark all”.
2) Call `PUT /api/notifications/:id/read` or `PUT /api/notifications/read-all`.
3) Update local state: decrement unread count, update item status.

### Realtime receive (Socket.IO)
1) Client connects to namespace `/notifications` with JWT (`handshake.auth.token` or `Authorization` header).
2) Server validates token and joins user room.
3) On new notification, server emits `notification:new` and updates `notification:unread-count`.
4) Client updates list/badge in real time.

### Admin: send notifications
1) Admin triggers send via:
   - `POST /api/admin/notifications/broadcast` (all users)
   - `POST /api/admin/notifications/role` (by role)
   - `POST /api/admin/notifications/user` (by user)
   - `POST /api/admin/notifications/maintenance`
2) Backend saves to DB, pushes via Socket.IO to targeted users.
3) Admin can query history/stats via `GET /api/admin/notifications` and `GET /api/admin/notifications/stats`.

## API contract (backend)

- User:
  - `GET /notifications` → list + pagination meta
  - `GET /notifications/unread-count` → `{ count }`
  - `GET /notifications/stats`
  - `PUT /notifications/:id/read`
  - `PUT /notifications/read-all`
- Admin:
  - `POST /admin/notifications/broadcast`
  - `POST /admin/notifications/role`
  - `POST /admin/notifications/user`
  - `POST /admin/notifications/maintenance`
  - `GET /admin/notifications`
  - `GET /admin/notifications/stats`
  - `DELETE /admin/notifications/:id`

## Client-side handling (suggested)

- State: notifications list, unread count, loading/error.
- Actions:
  - Load list + unread count on auth.
  - Append new items from Socket.IO; bump unread count.
  - Mark read/read-all: optimistic update with rollback on error.
- Socket:
  - Connect after auth; disconnect on logout.
  - Listen to `notification:new` and `notification:unread-count`.

## Error handling

- If API fails on mark-read/read-all, revert optimistic change and show toast.
- If Socket auth fails, retry connect after token refresh; fall back to polling.

## Future improvements (optional)

- Server-side pagination + lazy load in UI.
- Batch mark-read for selected items.
- Deduplicate notifications on reconnect.
- Per-device delivery preferences.
