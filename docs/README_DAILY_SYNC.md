# TMDB Daily Sync

This guide describes syncing TMDB Daily ID Exports into PostgreSQL.

## Overview

TMDB provides daily export files containing IDs of all valid content. The backend downloads and processes these files to update the database.

## Usage

### Via REST API

```bash
# Sync all for a specific date (YYYY-MM-DD)
POST http://localhost:8080/api/daily-sync/all?date=2025-09-04

# Sync movies
POST http://localhost:8080/api/daily-sync/movies?date=2025-09-04

# Sync TV series
POST http://localhost:8080/api/daily-sync/tv?date=2025-09-04

# Sync from the latest available export
POST http://localhost:8080/api/daily-sync/today

# View stats
GET http://localhost:8080/api/daily-sync/stats
```

### Using the service directly (in code)

```typescript
import { DailySyncService } from "./services/daily-sync.service";

constructor(private dailySyncService: DailySyncService) {}

await this.dailySyncService.syncTodayExports();
```

## Configuration

Minimum environment variables:

```env
TMDB_API_KEY=your_tmdb_api_key
TMDB_BASE_URL=https://api.themoviedb.org/3
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=your_username
DATABASE_PASSWORD=your_password
DATABASE_NAME=movie_db
```

## Notes

- Export files are available only for a limited window (per TMDB).
- Full catalog sync can take hours depending on resources and rate limits.
