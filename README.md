# Movie Backend API

NestJS-based movie backend API with PostgreSQL database and TMDB integration.

## Tính năng

Tài liệu chi tiết về các tính năng backend được tách ra tại `docs/FEATURES.md`.

## Tech Stack

- **Framework**: NestJS
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT + Passport
- **Validation**: class-validator, class-transformer
- **Scheduling**: @nestjs/schedule (Cron jobs)
- **HTTP Client**: Axios for TMDB API calls
- **Password Hashing**: bcrypt
- **WebSocket**: Socket.IO (NestJS gateway)
- **File Upload**: multer
- **Storage**: AWS S3 (optional)

## API Endpoints

Tài liệu tính năng chi tiết: `docs/FEATURES.md`.

Ghi chú: backend đặt global prefix `api`, vì vậy các path bên dưới đều có dạng `/{prefix}/{controller}` như `GET /api/movies`.

### Catalog (public)

- Movies
  - `GET /api/movies?page=1&limit=24&genres=28&year=2023&countries=US&sortBy=popularity.desc&language=en-US`
  - `GET /api/movies/now-playing`
  - `GET /api/movies/popular`
  - `GET /api/movies/top-rated`
  - `GET /api/movies/upcoming`
  - `GET /api/movies/:tmdbId`
  - `GET /api/movies/:tmdbId/credits`
  - `GET /api/movies/:tmdbId/videos`
  - `GET /api/movies/:tmdbId/recommendations`

- TV series
  - `GET /api/tv?page=1&limit=24&genres=16&year=2023&countries=JP&sortBy=popularity.desc&language=en-US`
  - `GET /api/tv/on-the-air`
  - `GET /api/tv/popular-tv`
  - `GET /api/tv/top-rated-tv`
  - `GET /api/tv/:tmdbId`
  - `GET /api/tv/:tmdbId/credits`
  - `GET /api/tv/:tmdbId/videos`
  - `GET /api/tv/:tmdbId/recommendations`

- Trending
  - `GET /api/trending?page=1&limit=24`

- Search
  - `GET /api/search?q=avengers&page=1&type=multi&language=en-US`

- People
  - `GET /api/people/popular?page=1`
  - `GET /api/people/:tmdbId`
  - `GET /api/people/:tmdbId/credits`
  - `GET /api/people/:tmdbId/credits/paginated?page=1&limit=20&mediaType=all&sortBy=release_date`

- Content lookup
  - `GET /api/content/lookup/tmdb/:tmdbId`

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/google`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me` (JWT required)

### User features (JWT required)

- Favorites: `GET /api/favorites`, `POST /api/favorites`, `DELETE /api/favorites`, `GET /api/favorites/ids`, `GET /api/favorites/check/:contentId/:contentType`
- Comments: `GET /api/comments/movie/:movieId`, `GET /api/comments/tv/:tvId`, `POST /api/comments`, `PUT /api/comments/:id`, `DELETE /api/comments/:id`, `POST /api/comments/:id/like`, `POST /api/comments/:id/report`
- Notifications: `GET /api/notifications`, `GET /api/notifications/unread-count`, `PUT /api/notifications/:id/read`, `PUT /api/notifications/read-all`
- Search history: `GET /api/search/recent`, `POST /api/search/recent`, `DELETE /api/search/recent`, `DELETE /api/search/recent/:id`

### Admin (JWT + role required)

- `POST /api/admin/auth/login`
- User management: `GET /api/admin/users/list`, `GET /api/admin/users/:id`, `POST /api/admin/users/ban`, `POST /api/admin/users/unban/:id`, `PUT /api/admin/users/:id/role`
- Content control: `POST /api/admin/content/block`, `POST /api/admin/content/unblock`, `GET /api/admin/content/list`, `GET /api/admin/content/blocked`, `GET /api/admin/content/trending`
- SEO metadata: `POST /api/admin/seo`, `PUT /api/admin/seo/:id`, `DELETE /api/admin/seo/:id`, `GET /api/admin/seo`, `GET /api/admin/seo/page-type/:pageType`, `POST /api/admin/seo/:id/toggle`
- Notifications: `POST /api/admin/notifications/broadcast`, `POST /api/admin/notifications/role`, `POST /api/admin/notifications/user`, `POST /api/admin/notifications/maintenance`, `GET /api/admin/notifications`, `GET /api/admin/notifications/stats`
- Comments moderation: `GET /api/admin/comments`, `GET /api/admin/comments/reported`, `PUT /api/admin/comments/:id/hide`, `PUT /api/admin/comments/:id/unhide`, `DELETE /api/admin/comments/:id`
- Dashboard and analytics: `GET /api/admin/dashboard/stats`, `GET /api/admin/analytics/overview`, `GET /api/admin/analytics/views`
- Manual sync (background): `POST /api/admin/sync`
- Sync catalog limits: `GET /api/admin/sync/settings`, `PATCH /api/admin/sync/settings`

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd movie-backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Setup environment variables**
   Create a `.env` file in the root directory (or copy from `.env.example`):

   ```env
   # Database Configuration
   DATABASE_HOST=localhost
   DATABASE_PORT=5432
   DATABASE_USERNAME=postgres
   DATABASE_PASSWORD=your-password
   DATABASE_NAME=movie_db

   # JWT Configuration
   JWT_SECRET=your-secret-key-here
   JWT_EXPIRES_IN=7d

   # TMDB API Configuration
   TMDB_API_KEY=your-tmdb-api-key-here
   TMDB_BASE_URL=https://api.themoviedb.org/3

   # Application Configuration
   PORT=8080
   NODE_ENV=development

   # TypeORM (optional)
   TYPEORM_SYNCHRONIZE=true
   TYPEORM_LOGGING=false
   DB_POOL_MAX=20
   DB_POOL_MIN=5

   # AWS S3 (optional, for upload)
   AWS_ACCESS_KEY_ID=replace-with-access-key
   AWS_SECRET_ACCESS_KEY=replace-with-secret-key
   AWS_REGION=ap-southeast-1
   AWS_S3_BUCKET_NAME=replace-with-bucket-name

   # Catalog limits (optional, for cleanup jobs)
   MOVIE_CATALOG_LIMIT=500000
   TV_CATALOG_LIMIT=200000
   TRENDING_CATALOG_LIMIT=100

   # Admin promotion (optional)
   ADMIN_PROMOTION_SECRET=replace-with-strong-secret
   ```

4. **Setup PostgreSQL Database**

   - Create a PostgreSQL database named `movie_db`
   - Update database credentials in `.env`

5. **Get TMDB API Key**
   - Register at [The Movie Database (TMDB)](https://www.themoviedb.org/)
   - Get your API key from account settings
   - Add it to `.env` file

## Usage

### Development

```bash
npm run start:dev
```

### Production Build

```bash
npm run build
npm run start:prod
```

### API Testing

Once running, the API will be available at `http://localhost:8080/api` (backend runs on port 8080)

Example requests:

```bash
# Get movies
curl http://localhost:8080/api/movies

# Search content
curl "http://localhost:8080/api/search?q=avengers"

# Register user
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

## Data Synchronization

Backend hỗ trợ nhiều cơ chế đồng bộ dữ liệu từ TMDB:

- **Popular sync (scheduled job)**: cron chạy mỗi ngày lúc `03:00` (timezone `UTC`) để sync popular movies, popular TV series và trending; sau đó chạy cleanup để giới hạn kích thước catalog theo các giá trị trong bảng `sync_settings` (seed từ `MOVIE_CATALOG_LIMIT`, `TV_CATALOG_LIMIT`, `TRENDING_CATALOG_LIMIT` hoặc chỉnh qua `PATCH /api/admin/sync/settings`).
- **Lazy-loading cho danh sách**: khi gọi `GET /api/movies` hoặc `GET /api/tv` mà trang chưa có trong DB, backend sẽ tự trigger sync trang đó, sau đó trả dữ liệu (kèm cờ `isOnDemandSync` trong response).
- **Daily export sync (manual)**: các endpoint `/api/daily-sync/*` để đồng bộ theo file daily exports của TMDB (movies/tv/all/today) và endpoint thống kê.
- **Sync endpoints (manual)**: `/api/sync/*` để sync nhanh popular/trending theo ngôn ngữ.

## Database Schema

### Movies

- Basic movie information from TMDB
- Release date, ratings, popularity
- Genre IDs for filtering

### TV Series

- TV series information with first air date
- Origin country and language data
- Genre categorization

### Trending

- Mixed content (movies and TV)
- Media type differentiation
- Real-time popularity data

### Users

- Encrypted passwords with bcrypt
- JWT-based session management
- Basic profile information

### Favorites

- Favorites theo user cho movie/tv
- Hỗ trợ truy vấn nhanh danh sách ID và kiểm tra một item

### Comments

- Comment theo movie/tv, hỗ trợ reply dạng cây
- Like/dislike, report, ẩn/hiện cho moderation
- Mention user và lọc nội dung (banned words)

### Notifications

- Lưu DB, read/unread, thống kê
- Hỗ trợ template và analytics (admin)

### SEO Metadata

- Lưu metadata theo `pageType`, có thể bật/tắt theo trạng thái

## Security Features

- **JWT Authentication**: Token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Input Validation**: Request validation and sanitization
- **Environment Variables**: Config-based secrets and credentials
- **CORS Configuration**: Cross-origin request handling

## Error Handling

- Standardized JSON error responses
- HTTP status codes (200, 400, 404, 500)
- Detailed error messages for development
- Rate limiting protection for external API calls
- Database connection error handling

## Development Guidelines

### Project Structure

```
src/
├── auth/           # Authentication guards and strategies
├── commands/        # CLI-like commands (work in progress)
├── controllers/    # API controllers
├── decorators/      # Custom decorators (GetUser, Roles)
├── dto/           # Data Transfer Objects
├── entities/      # Database entities
├── gateways/        # WebSocket gateways (Socket.IO)
├── guards/          # Authorization guards (roles, jwt)
├── interfaces/    # TypeScript interfaces
├── modules/       # NestJS modules
├── repositories/  # Database repositories
├── services/      # Business logic services
├── tasks/         # Cron job tasks
└── main.ts       # Application entry point
```

### Adding New Features

1. Create entity in `src/entities/`
2. Add repository in `src/repositories/`
3. Create service in `src/services/`
4. Add controller in `src/controllers/`
5. Register in appropriate module

## Tài liệu liên quan

- `docs/DEPLOYMENT.md` - Hướng dẫn deploy (PM2, Nginx, env production)
- `docs/README_DAILY_SYNC.md` - Hướng dẫn daily export sync
- `docs/NOTIFICATION_SETUP.md` - Mô tả hệ thống notification và migration liên quan

## Lưu ý khi public API

Trong code hiện tại có một số endpoint phục vụ maintenance/debug không có guard (ví dụ: `/api/sync/*`, `/api/daily-sync/*`, `/api/recommendations/*`, `/api/people/admin/cache/*`, `/api/debug/*`, `/api/demo/*`). Nếu backend được public ra Internet, nên giới hạn bằng network policy hoặc bổ sung guard trước khi đưa lên production.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the ISC License.
