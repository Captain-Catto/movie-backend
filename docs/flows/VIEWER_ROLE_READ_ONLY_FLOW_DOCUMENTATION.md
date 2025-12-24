# Viewer Role Read-Only Flow

Flow for handling viewer role, blocking writes, and auditing attempts.

## Scope and files

- Backend: `movie-backend/src/interceptors/viewer-read-only.interceptor.ts`, `src/entities/viewer-audit-log.entity.ts`, migration `016_create_viewer_audit_logs.sql`, role enum in `src/entities/user.entity.ts`, wiring via `ViewerAuditModule` and interceptor usage in admin controllers.
- Frontend: no special handling required; viewer gets normal responses but writes are faked.

## Behavior

1) Controllers decorated with `@UseInterceptors(ViewerReadOnlyInterceptor)` and roles including `viewer` allow viewer access.
2) When a viewer sends a write method (POST/PUT/PATCH/DELETE):
   - Interceptor logs attempt to `viewer_audit_logs` (userId, endpoint, method, payload, query, IP, user-agent, description).
   - Returns a fake success response with canned message/data; actual DB write is blocked.
3) GET requests pass through normally.

## Audit logging

- Table: `viewer_audit_logs` with indexes on `userId` and `createdAt`.
- Logged fields: userId, endpoint, httpMethod, payload, queryParams, ipAddress, userAgent, attemptedAction, createdAt.

## Setup

- Ensure migration `016_create_viewer_audit_logs.sql` applied.
- Ensure `viewer` value added to `users_role_enum` in DB.
- Interceptor provided via `ViewerAuditModule`; controllers must include it and allow `UserRole.VIEWER`.

## Error handling

- If the audit table is missing, insert fails and is caught; interceptor logs error to console and continues (viewer still gets fake success).
- If viewer role is not in the DB enum, API may reject requests that map to the enum; run the enum migration first.
