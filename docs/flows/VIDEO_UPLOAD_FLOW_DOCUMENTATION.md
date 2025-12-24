# Video Upload Flow

End-to-end flow for uploading movie/TV assets to S3.

## Scope and files

- Backend: `movie-backend/src/controllers/upload.controller.ts` (`POST /upload/video`), `src/services/s3.service.ts` (`uploadMovie`).
- Frontend: none currently wired in UI; any client can post multipart to the API.

## Flow (client → backend)

1) Client sends multipart `POST /api/upload/video` with field `video`.
2) Backend validates mimetype starts with `video/`, enforces size limit 500MB.
3) Backend uploads buffer to S3 with sanitized filename, key `movies/<timestamp>-<name>`.
4) Response includes `{ success, url, key, filename }`.
5) Client stores `url`/`key` as reference; playback can use public URL or signed URL (`getSignedStreamUrl` if needed).

## Validation and limits

- Size: 500 MB (config in controller).
- Mimetype: must start with `video/`.
- Filenames sanitized (spaces → underscores, remove special chars/diacritics).

## Error handling

- If no file or wrong mimetype: 400 Bad Request.
- If S3 upload fails: 400 with message; log error server-side.
- Clients should show an error and not persist a broken `key`.

## Optional playback

- Public URL: `https://<bucket>.s3.<region>.amazonaws.com/<key>`.
- Private streaming: call backend `getSignedStreamUrl(key)` (expose endpoint if required).
