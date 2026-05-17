# Backend Setup Guide

## Prerequisites
- Node.js (v18+)
- PostgreSQL
- Redis (optional, for caching)

## Environment Variables
Create a `.env` file in the root directory:

```env
# Server
PORT=8080
NODE_ENV=development

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=movie_db

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=1d

# AWS S3 (for Image/Video Uploads)
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET_NAME=your_bucket_name
```

## Running the Application

```bash
# Install dependencies
npm install

# Run migration
npm run migrate

# Start development server
npm run start:dev

# Build for production
npm run build
npm run start:prod
```

## Security
This application uses `helmet` to set secure HTTP headers.
- **XSS Protection**: Enabled
- **FrameGuard**: CAUTION (Deny/SameOrigin)
- **HSTS**: Enabled in production

## API Documentation
Swagger/OpenAPI is always mounted, but it is protected by a dedicated Swagger login page.

- Swagger UI: `/api-docs`
- OpenAPI JSON: `/api-docs-json`
- Swagger login: `/api-docs-login`
- Swagger logout: `/api-docs-logout`

When a user opens `/api-docs`, the backend redirects unauthenticated requests to
`/api-docs-login`. After a successful login, the backend stores an httpOnly
cookie and redirects back to Swagger UI. `/api-docs-json` is protected by the
same cookie and returns `401` if the user is not logged in.

### Configuring Swagger Access

Swagger credentials are not stored in `.env`. They are configured from the admin
panel and saved in the `settings` table with key `swaggerAuthSettings`.

1. Log in to the admin dashboard.
2. Open `https://movie.lequangtridat.com/admin/settings`.
3. Find the **Swagger Access** section.
4. Set a Swagger username and password.
5. Save changes.
6. Open `https://api-movie.lequangtridat.com/api-docs`.
7. Log in with the Swagger username/password configured above.

The Swagger password is stored as a bcrypt hash. The admin settings API never
returns the plain password. When updating Swagger Access, leave the password
field blank to keep the current password.

### First-Time Setup

If Swagger Access has not been configured yet, `/api-docs` cannot be opened.
Configure it first from `/admin/settings` using an existing admin account.

### Testing Authenticated APIs in Swagger

Swagger login only controls access to the documentation page. It does not
automatically authenticate API calls.

To test JWT-protected APIs in Swagger:

1. Open `/api-docs`.
2. Call `POST /api/auth/login` or `POST /api/admin/auth/login`.
3. Copy the returned access token.
4. Click **Authorize** in Swagger UI.
5. Paste the JWT bearer token.

### Operational Notes

- `/api-docs` requires the Swagger session cookie.
- `/api-docs-json` requires the same session cookie.
- `/api-docs-login` accepts the Swagger username/password from DB settings.
- `/api-docs-logout` clears the Swagger session cookie.
- Swagger access is separate from app roles. Use strong, dedicated credentials.
