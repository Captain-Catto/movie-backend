# Notification System Setup Guide

## Overview

The notification system includes:

- Admin notifications to users (individual/role/all)
- Real-time notifications (Socket.IO-ready)
- Notification types: info, success, warning, error, system
- Read/unread status tracking
- Scheduled notifications (optional)
- PostgreSQL persistence

## Database migration

Run all migrations with `psql` via npm script:

```bash
npm run migrate
```

Requires `psql` and `.env` configured (`DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `DATABASE_NAME`).

## API endpoints

### User notifications

```typescript
GET /api/notifications              // List notifications
GET /api/notifications/unread-count // Unread count
GET /api/notifications/stats        // User stats
PUT /api/notifications/:id/read     // Mark as read
PUT /api/notifications/read-all     // Mark all as read
```

### Admin notifications

```typescript
POST /api/admin/notifications/broadcast    // Send to all users
POST /api/admin/notifications/role         // Send by role
POST /api/admin/notifications/user         // Send to a user
POST /api/admin/notifications/maintenance  // Maintenance notice
GET  /api/admin/notifications              // Sent history
GET  /api/admin/notifications/stats        // Admin stats
DELETE /api/admin/notifications/:id        // Delete notification
```

## Testing

### 1. Broadcast notification

```bash
curl -X POST http://localhost:8080/api/admin/notifications/broadcast \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{
    "title": "Welcome to the new system!",
    "message": "Notification system updated. You will receive real-time alerts from now on.",
    "type": "success"
  }'
```

### 2. User notifications

```bash
curl -X GET http://localhost:8080/api/notifications \
  -H "Authorization: Bearer YOUR_USER_JWT_TOKEN"
```

### 3. Unread count

```bash
curl -X GET http://localhost:8080/api/notifications/unread-count \
  -H "Authorization: Bearer YOUR_USER_JWT_TOKEN"
```
