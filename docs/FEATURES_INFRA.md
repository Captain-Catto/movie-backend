# Backend Features: Infrastructure

## 1. Media Upload (AWS S3)
**Goal:** Scalable media storage.

- **Service:** `s3.service.ts` (part of `upload.module`).
- **Function:** Uploads User Avatars and Video content directly to AWS S3.
- **Security:** Validates mime-types and file sizes before upload.

## 2. Realtime Gateway
**Goal:** Live updates.

- **Tech:** Socket.IO.
- **Namespaces:** `/notifications` for user alerts.
- **Auth:** JWT validation on socket connection.

## 3. Environment Configuration
Required `.env` variables for the system to operate:

```env
# Core
PORT=8080
NODE_ENV=development

# Database (PostgreSQL)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=...
DATABASE_NAME=movie_db

# Auth
JWT_SECRET=super_secret
JWT_EXPIRES_IN=1d

# External APIs
TMDB_API_KEY=...
TMDB_BASE_URL=https://api.themoviedb.org/3

# AWS S3 (Optional for uploads)
AWS_REGION=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET_NAME=...
```

## 4. Security Headers
- Uses `helmet` for HTTP security (XSS, HSTS, etc).
- CSRF protection enabled.
- Rate limiting configured for auth routes.
