# 🔔 Notification System Setup Guide

## 📋 **Tổng quan**

Hệ thống notification đã được tạo hoàn chỉnh với các tính năng:

- ✅ **Admin gửi thông báo** tới users (individual/group/all)
- ✅ **Real-time notifications** (chuẩn bị cho WebSocket)
- ✅ **Notification types**: info, success, warning, error, system
- ✅ **Read/unread status** tracking
- ✅ **Scheduled notifications** (tuỳ chọn)
- ✅ **Database persistence** với PostgreSQL

## 🗃️ **Database Migration**

Chạy toàn bộ migrations bằng `psql` thông qua npm script:

```bash
npm run migrate
```

Lưu ý: cần cài `psql` và cấu hình `.env` (DATABASE_HOST, DATABASE_PORT, DATABASE_USERNAME, DATABASE_PASSWORD, DATABASE_NAME).

## 🚀 **API Endpoints Đã Tạo**

### **User Notifications**

```typescript
GET /api/notifications              // Lấy danh sách notifications
GET /api/notifications/unread-count // Số lượng chưa đọc
GET /api/notifications/stats        // Thống kê notifications
PUT /api/notifications/:id/read     // Đánh dấu đã đọc
PUT /api/notifications/read-all     // Đánh dấu tất cả đã đọc
```

### **Admin Notifications**

```typescript
POST /api/admin/notifications/broadcast    // Gửi tới tất cả users
POST /api/admin/notifications/role         // Gửi theo role
POST /api/admin/notifications/user         // Gửi tới user cụ thể
POST /api/admin/notifications/maintenance  // Thông báo bảo trì
GET  /api/admin/notifications              // Lịch sử đã gửi
GET  /api/admin/notifications/stats        // Thống kê admin
DELETE /api/admin/notifications/:id        // Xoá notification
```

## 🧪 **Test APIs**

### **1. Test Broadcast Notification**

```bash
curl -X POST http://localhost:8080/api/admin/notifications/broadcast \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{
    "title": "Chào mừng hệ thống mới!",
    "message": "Chúng tôi đã cập nhật hệ thống notification. Bạn sẽ nhận được thông báo real-time từ giờ!",
    "type": "success"
  }'
```

### **2. Test User Notifications**

```bash
curl -X GET http://localhost:8080/api/notifications \
  -H "Authorization: Bearer YOUR_USER_JWT_TOKEN"
```

### **3. Test Unread Count**

```bash
curl -X GET http://localhost:8080/api/notifications/unread-count \
  -H "Authorization: Bearer YOUR_USER_JWT_TOKEN"
```

