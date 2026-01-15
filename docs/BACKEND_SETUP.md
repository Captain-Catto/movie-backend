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
The API documentation is available at `/api/docs` (if Swagger is enabled).
