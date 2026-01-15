# Backend Features: Content & Catalog

## 1. Catalog (Movies & TV Series)
**Goal:** Provide paginated, filtered lists and integrated details.

### Movies
- **Filters:** `genres`, `year`, `countries`, `sortBy`, `language`, `page`, `limit`.
- **Feeds:** Now Playing, Popular, Top Rated, Upcoming.
- **Details:** Full metadata via TMDB ID, including credits, videos, and recommendations.

### TV Series
- **Filters:** Same as movies.
- **Feeds:** On The Air, Popular, Top Rated.
- **Details:** Seasons, episodes, credits.

### Code References
- **Controllers:** `movie.controller.ts`, `tv.controller.ts`, `movie-detail.controller.ts`
- **Services:** `movie.service.ts`, `tv-series.service.ts`

---

## 2. TMDB Synchronization
**Goal:** Balance data freshness with system performance.

### Sync Models
1.  **Scheduled Sync (Popular):** Runs daily at 03:00 UTC. Syncs trending/popular content.
2.  **On-Demand (Lazy Loading):** Fetches from TMDB if data is missing in local DB.
3.  **Manual Sync:** Admin endpoints to force sync specific items or categories.
4.  **Daily Export:** Processes TMDB daily export files for bulk updates.

### Code References
- **Controllers:** `sync.controller.ts`, `daily-sync.controller.ts`
- **Services:** `data-sync.service.ts`, `daily-sync.service.ts`

---

## 3. Search System
**Goal:** Multi-entity search with history tracking.

- **Endpoints:** `GET /api/search?type=multi|movie|tv`
- **Features:**
    - Supports pagination.
    - Tracks recent search history per user (if logged in).
    - clear/delete search history options.

### Code References
- **Modules:** `search.module.ts`

---

## 4. People & Casting
**Goal:** Efficient access to cast/crew profiles.

- **Features:**
    - Caches person details to minimize TMDB API calls.
    - Popular people feed.
    - Full credits listing.

### Code References
- **Modules:** `people.module.ts`
