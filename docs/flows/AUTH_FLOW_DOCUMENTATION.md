# Auth Feature Flows

End-to-end flows for authentication (frontend + backend).

## Scope and files

- Backend: `movie-backend/src/controllers/auth.controller.ts`, `src/controllers/admin-auth.controller.ts`, `src/services/auth.service.ts`, `src/auth/jwt-auth.guard.ts`, `src/auth/jwt.strategy.ts`, entities `user.entity.ts`, `refresh-token.entity.ts`.
- Frontend: auth API service/slice/hooks (`movie-frontend/movie-app/src/services/auth-api.ts`, `src/store/authSlice.ts`, `src/hooks/useAuth.ts`), Axios interceptor in `src/lib/axios-instance.ts`.

## Flows

### Register (email/password)
1) User submits name/email/password.
2) Frontend calls `POST /api/auth/register`.
3) Backend creates user, returns `token` (access), `refreshToken`, `user`.
4) Client stores tokens (authStorage/local), updates auth state.

### Login (email/password)
1) User submits email/password.
2) Frontend calls `POST /api/auth/login`.
3) Backend validates credentials and active status, returns `token`, `refreshToken`, `user`.
4) Client saves tokens and user; initializes session state.

### Google login (payload)
1) Client obtains Google payload; calls `POST /api/auth/google` with `{ email, name, googleId, image? }`.
2) Backend creates/links user, returns tokens and user.
3) Client stores tokens/user as in login.

### Refresh access token
1) Axios interceptor catches 401 (non-auth endpoints).
2) If not already refreshing, call `POST /api/auth/refresh` with `refreshToken`.
3) On success, store new tokens, retry original request.
4) On failure, clear auth and emit logout event.

### Logout
1) Client optionally calls `POST /api/auth/logout` with `refreshToken` to revoke.
2) Clear tokens/user locally; disconnect sockets; reset related state (favorites, notifications).

### Profile update (name/password/image)
1) Authenticated call `PUT /api/auth/profile` with provided fields.
2) Backend updates user (hash password if provided).
3) Client updates stored user (e.g., name/image) and refreshes auth state.

## Token handling (frontend)

- Access token stored in local storage via `authStorage`; attached via Axios request interceptor (`Authorization: Bearer <token>`).
- Refresh token stored alongside; used in refresh flow.
- On logout or refresh failure, clear both and dispatch logout actions.

## API contract (backend)

- `POST /auth/register` → tokens + user
- `POST /auth/login` → tokens + user
- `POST /auth/google` → tokens + user
- `GET /auth/me` (JWT) → user
- `POST /auth/refresh` → new tokens
- `POST /auth/logout` (optional refresh token to revoke)
- `PUT /auth/profile` (JWT) → updated user
