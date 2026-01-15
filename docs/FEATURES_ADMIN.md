# Backend Features: Admin & Operations

## 1. Admin Dashboard & Analytics
**Goal:** System visibility and performance tracking.

### Features
- **Overview:** User growth, active sessions.
- **Content Stats:** Most viewed movies/TV, trending genres.
- **System Health:** Error rates, sync status.

### Code References
- **Modules:** `admin.module.ts`, `analytics.module.ts`

---

## 2. Content Control & CMS
**Goal:** Manage catalog availability and metadata.

### Features
- **Visibility:** Hide/Show specific content (e.g., copyright issues).
- **SEO Management:** Edit SEO titles, descriptions, and keywords for pages.
- **Featured:** Manually select content for "Featured" sliders.

### Code References
- **Modules:** `content.module.ts`, `settings.module.ts`

---

## 3. Moderation
**Goal:** Maintain community standards.

### Features
- **Comment Moderation:** View reported comments, delete/hide violations.
- **User Management:** Ban/Suspend users, view user activity logs.
- **Broadcasting:** Send system-wide notifications to all users.

### Code References
- **Modules:** `admin.module.ts`, `notification.module.ts`
