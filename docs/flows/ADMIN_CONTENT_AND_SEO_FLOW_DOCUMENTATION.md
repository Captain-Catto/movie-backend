# Admin Content Control and SEO Flows

Flows for blocking/unblocking content and managing SEO metadata.

## Scope and files

- Backend: `movie-backend/src/controllers/admin-content.controller.ts`, `src/controllers/admin-seo.controller.ts`, services `admin-content.service.ts`, `admin-seo.service.ts`, entities `content-control.entity.ts`, `seo-metadata.entity.ts`.
- Frontend: admin UI pages for content control and SEO.

## Content control flows

### Block / Unblock content
1) Admin submits `contentId` + `contentType` (movie|tv) to block.
2) `POST /api/admin/content/block` (or unblock endpoint).
3) Backend records block state; responses used to toggle UI.

### List/search blocked content
1) `GET /api/admin/content` with filters (status, search).
2) Client renders list; allows unblock or view details.

### Hide/unhide trending
1) `POST /api/admin/content/trending/hide` (with `tmdbId`, `mediaType`) or unhide equivalent.
2) Used to suppress items from trending feeds.

## SEO metadata flows

### Create / Update SEO metadata
1) Admin submits `pageType` + metadata fields.
2) Create: `POST /api/admin/seo`; Update: `PUT /api/admin/seo/:id`.
3) Backend saves metadata; client refreshes list/detail.

### Delete SEO metadata
1) `DELETE /api/admin/seo/:id`.
2) Remove entry; client updates list.

### Fetch by page type / list
1) `GET /api/admin/seo` (list with filters) or `GET /api/admin/seo/by-page-type?pageType=...`.
2) Client displays entries for editing/inspection.

## Client handling (suggested)

- State: lists with pagination/filter; edit forms with validation.
- Confirm destructive actions (delete/unblock).
- Cache `pageType` options; enforce required fields before submit.
