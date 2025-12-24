# Comments Feature Flows

End-to-end flows for comments (user actions + admin moderation).

## Scope and files

- Backend: `movie-backend/src/controllers/comment.controller.ts`, `src/controllers/admin-comment.controller.ts`, services `comment.service.ts`, `content-filter.service.ts`, entities `comment.entity.ts`, `comment-like.entity.ts`, `comment-mention.entity.ts`, `comment-report.entity.ts`, `banned-word.entity.ts`.
- Frontend: comments service/hook/components (`src/services/comment.service.ts`, `src/hooks/use-comments.ts`, `src/components/comments/*`).

## User flows (JWT)

### Create comment/reply
1) User submits content for movie/tv (or parentId for reply).
2) Client may run content filter check; sends `POST /api/comments`.
3) Backend validates content, saves comment, returns created item.
4) Client inserts into list; increments reply count if nested.

### Edit comment
1) User edits own comment.
2) `PUT /api/comments/:id` with new content.
3) Client updates content and `isEdited` flag.

### Delete comment
1) User deletes own comment.
2) `DELETE /api/comments/:id`.
3) Client removes item; decrements reply count on parent.

### Like / Dislike
1) User clicks like or dislike.
2) Client calls `POST /api/comments/:id/like` or `POST /api/comments/:id/dislike`.
3) Backend toggles reaction and returns counts + userLike state.
4) Client updates counts and userLike.

### Report comment
1) User submits report reason.
2) `POST /api/comments/:id/report`.
3) Backend records report; client may show toast/flag.

### Mentions
1) User types `@` to search users.
2) Client calls search endpoint (e.g., `GET /api/comments/users/search?q=`).
3) Selected users saved as mentions; rendered in comment.

## Admin moderation flows (JWT + role)

### List/review reported comments
1) Admin calls `GET /api/admin/comments/reported` (with filters/pagination).
2) Displays reported items for action.

### Hide/Unhide or Delete
1) Admin chooses hide/unhide: `PUT /api/admin/comments/:id/hide` or `.../unhide`.
2) Delete: `DELETE /api/admin/comments/:id`.
3) Client updates visibility or removes from list.

### Resolve report
1) `PUT /api/admin/comments/:id/resolve-report`.
2) Marks report as handled.

### Banned words management
1) List: `GET /api/admin/comments/banned-words`.
2) Add: `POST /api/admin/comments/banned-words`.
3) Delete: `DELETE /api/admin/comments/banned-words/:id`.

## Client-side handling (suggested)

- State: comments tree/list, reply counts, reactions, loading/error flags.
- Optimistic: optional for like/dislike; revert on error.
- On delete, update parent reply count locally.
- Mentions: cache search results to reduce calls.

## API contract (core user endpoints)

- `GET /comments` (by movieId/tvId, pagination)
- `GET /comments/:id/replies` (pagination)
- `POST /comments` (create)
- `PUT /comments/:id` (edit)
- `DELETE /comments/:id` (delete)
- `POST /comments/:id/like`
- `POST /comments/:id/dislike`
- `POST /comments/:id/report`
- Mention search endpoint (as implemented in your service)

Admin endpoints: see `admin-comment.controller.ts` for hide/unhide/delete/reported/banned-words/report-resolution.
