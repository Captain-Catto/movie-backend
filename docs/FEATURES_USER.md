# Backend Features: User Services

## 1. Authentication & Identity
**Goal:** Secure user access and profile management.

### Features
- **Registration/Login:** Email & Password.
- **Google Auth:** OAuth2 integration via token payload.
- **Session:** JWT-based access (short-lived) and Refresh Tokens (long-lived).
- **Profile:** Manage user details, avatar update.

### Code References
- **Modules:** `auth.module.ts`, `user.module.ts`

---

## 2. Favorites System
**Goal:** Personalized content lists.

### Features
- **CRUD:** Add/Remove movies or TV shows to favorites.
- **Optimization:** Fast "is favorite" check endpoint for UI icons.
- **Listing:** Paginated favorite lists with full metadata.

### Code References
- **Modules:** `favorite.module.ts`

---

## 3. Comments & Interaction
**Goal:** Community engagement.

### Features
- **Comments:** Post comments on Movie/TV details.
- **Replies:** Threaded reply support.
- **Reactions:** Like/Dislike comments.
- **Reporting:** Report inappropriate content for moderation.

### Code References
- **Modules:** `comment.module.ts`

---

## 4. User Notifications
**Goal:** Personal updates.

### Features
- **System:** Receive notifications for replies, mentions, or system announcements.
- **Realtime:** Socket.IO integration for instant alerts.
- **Management:** Mark as read, clear all.

### Code References
- **Modules:** `notification.module.ts`
