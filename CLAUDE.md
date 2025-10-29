# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Development Server

- `npm run start:dev` - Start development server with hot reload using nodemon
- `npm run start:debug` - Start server in debug mode with inspector
- `npm start` or `npm run start:prod` - Start production server (requires build first)

### Build and Compilation

- `npm run build` - Compile TypeScript to JavaScript in dist/ directory
- `tsc` - Direct TypeScript compilation

### Code Quality

- `npm run lint` - Run ESLint with auto-fix on TypeScript files
- `npm run format` - Format code using Prettier

### Testing

- No test framework currently configured (package.json shows placeholder test command)

## Project Architecture

### Core Framework

- **NestJS** application with TypeScript
- **PostgreSQL** database with TypeORM ORM
- **JWT authentication** with Passport strategies
- **TMDB API integration** for movie data
- **Scheduled tasks** for data synchronization

### Module Structure

The application follows NestJS modular architecture:

- `MovieModule` - Movie CRUD operations and TMDB integration
- `TVModule` - TV series management
- `TrendingModule` - Trending content tracking
- `SearchModule` - Cross-content search functionality
- `AuthModule` - JWT authentication with bcrypt password hashing
- `DataSyncModule` - Automated TMDB data synchronization with cron jobs

### Key Entities

- `Movie` - TMDB movie data with ratings, genres, popularity
- `TVSeries` - TV show data with air dates and origin info
- `Trending` - Mixed content trending data
- `User` - Authentication with encrypted passwords

### Application Configuration

- **Port**: 8080 (configurable via PORT env var)
- **Global prefix**: `/api`
- **CORS**: Enabled for localhost:3000 and 127.0.0.1:3000
- **Validation**: Global ValidationPipe with whitelist and transformation
- **Database sync**: Auto-sync in development mode only

### Data Flow

1. **TMDB Service** fetches data from external API
2. **Data Sync Service** processes and stores data via repositories
3. **Cron jobs** automate regular data synchronization
4. **Controllers** provide REST API endpoints with filtering and pagination
5. **JWT Guards** protect authenticated routes

### Environment Dependencies

Requires `.env` file with:

- Database connection (PostgreSQL)
- JWT secret and expiration
- TMDB API key and base URL
- Application port and environment

### Key Patterns

- Repository pattern for data access
- DTO validation with class-validator
- Service layer for business logic
- Module-based feature organization
- Global error handling and CORS configuration
