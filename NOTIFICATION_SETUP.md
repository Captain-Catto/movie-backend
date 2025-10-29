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

### **Bước 1: Chạy Migration**

```bash
# Trên Windows
cd e:\movie\movie-backend
run-migrations.bat

# Hoặc trên Linux/Mac
chmod +x run-migrations.sh
./run-migrations.sh
```

### **Bước 2: Verify Database**

Migration sẽ:

1. **Loại bỏ `firstName` và `lastName`** từ bảng `users`
2. **Kết hợp thành `name`** làm username
3. **Tạo bảng `notifications`** với đầy đủ indexes

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
curl -X POST http://localhost:3000/api/admin/notifications/broadcast \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{
    "title": "🎉 Chào mừng hệ thống mới!",
    "message": "Chúng tôi đã cập nhật hệ thống notification. Bạn sẽ nhận được thông báo real-time từ giờ!",
    "type": "success"
  }'
```

### **2. Test User Notifications**

```bash
curl -X GET http://localhost:3000/api/notifications \
  -H "Authorization: Bearer YOUR_USER_JWT_TOKEN"
```

### **3. Test Unread Count**

```bash
curl -X GET http://localhost:3000/api/notifications/unread-count \
  -H "Authorization: Bearer YOUR_USER_JWT_TOKEN"
```

## 📁 **Files Đã Tạo**

### **Backend**

```
src/entities/notification.entity.ts           ✅
src/dto/notification.dto.ts                   ✅
src/repositories/notification.repository.ts   ✅
src/services/notification.service.ts          ✅
src/controllers/notification.controller.ts    ✅
src/controllers/admin-notification.controller.ts ✅
src/modules/notification.module.ts            ✅
migrations/001_remove_firstname_lastname.sql  ✅
migrations/002_create_notifications_table.sql ✅
```

### **Entity Changes**

```
src/entities/user.entity.ts     ✅ (removed firstName, lastName)
src/interfaces/user.interface.ts ✅ (updated UserResponse)
src/dto/auth.dto.ts             ✅ (updated RegisterDto)
src/services/auth.service.ts    ✅ (updated registration)
```

## 📊 **Database Schema**

### **Users Table (Updated)**

```sql
users (
  id SERIAL PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  password VARCHAR,
  name VARCHAR NOT NULL,          -- ✅ Username/Display name
  image VARCHAR,
  googleId VARCHAR,
  provider VARCHAR DEFAULT 'email',
  role VARCHAR DEFAULT 'user',
  permissions TEXT[],
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
)
```

### **Notifications Table (New)**

```sql
notifications (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'info',    -- info, success, warning, error, system
  targetType VARCHAR(20) DEFAULT 'user', -- all, user, role
  targetValue VARCHAR(100),           -- userId, role name, or null
  isRead BOOLEAN DEFAULT FALSE,
  userId INTEGER REFERENCES users(id),
  senderId INTEGER REFERENCES users(id),
  scheduledAt TIMESTAMP,
  readAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
)
```

## 🎯 **Next Steps**

### **Phase 2: Frontend Integration**

1. **Notification Context** - React context cho state management
2. **Notification Bell** - Component hiển thị số lượng chưa đọc
3. **Notification Dropdown** - Danh sách notifications
4. **Admin Panel** - Interface gửi notifications
5. **Toast Notifications** - Popup notifications

### **Phase 3: Real-time (WebSocket)**

1. **Socket.io Integration** - Real-time delivery
2. **WebSocket Gateway** - NestJS gateway
3. **Client WebSocket** - Frontend connection

### **Phase 4: Advanced Features**

1. **Email Notifications** - Send via email
2. **Push Notifications** - Browser push
3. **Notification Templates** - Pre-defined templates
4. **Analytics & Reporting** - Usage statistics

## 🔧 **Usage Examples**

### **System Notifications**

```typescript
// Welcome new user
await notificationService.sendWelcomeNotification(userId);

// Password reset
await notificationService.sendPasswordResetNotification(userId);

// Maintenance announcement
await notificationService.sendMaintenanceNotification();
```

### **Custom Notifications**

```typescript
// Send to specific user
await notificationService.createUserNotification(
  {
    title: "Phim mới cập nhật!",
    message: "Bộ phim bạn theo dõi vừa có tập mới",
    type: "info",
    userId: 123,
  },
  adminId
);

// Send to all admins
await notificationService.createRoleNotification(
  {
    title: "Báo cáo hệ thống",
    message: "Có 10 users mới đăng ký hôm nay",
    type: "info",
    role: "admin",
  },
  adminId
);
```

## ✅ **Backend hoàn thành!**

Hệ thống notification backend đã sẵn sàng. Bạn có thể:

1. **Chạy migration** để cập nhật database
2. **Test APIs** bằng Postman hoặc curl
3. **Tiếp tục với frontend** integration

Có cần tôi tiếp tục với frontend components không?
