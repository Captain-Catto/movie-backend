# Admin Users Flow

Flows for admin user management (roles, ban/unban).

## Scope and files

- Backend: `movie-backend/src/controllers/admin-user.controller.ts`, service `admin-user.service.ts`, guards `jwt-auth.guard.ts`, `roles.guard.ts`, `@Roles`.
- Frontend: admin UI for users list/details (check admin pages/components).

## Flows

### List and filter users
1) Admin calls `GET /api/admin/users/list` with optional `page`, `limit`, `status` (active/banned/all), `role`, `search`.
2) Backend returns paginated users + metadata.

### Get user details
1) `GET /api/admin/users/:id`.
2) Returns full user info (role, status, metadata).

### Update role
1) Admin chooses new role (user/admin/super_admin/viewer).
2) `PUT /api/admin/users/:id/role` with `{ role }`.
3) Backend updates role; client refreshes list/detail.

### Ban / Unban
1) Ban: `POST /api/admin/users/ban` with `{ userId, reason }`.
2) Unban: `POST /api/admin/users/unban/:id`.
3) Backend sets `isActive` and ban metadata; client updates status.

### Update profile (admin-side)
1) `PUT /api/admin/users/:id` with profile fields (name, etc.).
2) Backend updates user and returns updated data.

## Client handling (suggested)

- State: list, filters, pagination, selection.
- Optimistic optional for role change/ban; otherwise refetch row.
- Show confirmations for ban/unban/role changes.

## Permissions

- Guarded by JWT + roles (`ADMIN`, `SUPER_ADMIN`, `VIEWER` may be allowed read-only via interceptor as configured).
