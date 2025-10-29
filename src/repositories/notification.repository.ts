import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, FindManyOptions, In } from "typeorm";
import {
  Notification,
  NotificationType,
  NotificationTargetType,
} from "../entities/notification.entity";
import { User, UserRole } from "../entities/user.entity";
import { GetNotificationsQueryDto } from "../dto/notification.dto";

@Injectable()
export class NotificationRepository {
  constructor(
    @InjectRepository(Notification)
    private repository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  async create(notificationData: Partial<Notification>): Promise<Notification> {
    const notification = this.repository.create(notificationData);
    return await this.repository.save(notification);
  }

  async findById(id: number): Promise<Notification> {
    return await this.repository.findOne({
      where: { id },
      relations: ["user", "sender"],
    });
  }

  async findByUserId(
    userId: number,
    query: GetNotificationsQueryDto
  ): Promise<{ notifications: Notification[]; total: number }> {
    const { page = 1, limit = 20, type, unreadOnly = false } = query;
    const skip = (page - 1) * limit;

    const whereConditions: any = { userId };

    if (type) {
      whereConditions.type = type;
    }

    if (unreadOnly) {
      whereConditions.isRead = false;
    }

    const findOptions: FindManyOptions<Notification> = {
      where: whereConditions,
      relations: ["sender"],
      order: { createdAt: "DESC" },
      skip,
      take: limit,
    };

    const [notifications, total] = await this.repository.findAndCount(
      findOptions
    );

    return { notifications, total };
  }

  async getUnreadCount(userId: number): Promise<number> {
    return await this.repository.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(id: number, userId: number): Promise<Notification> {
    await this.repository.update(
      { id, userId },
      { isRead: true, readAt: new Date() }
    );
    return await this.findById(id);
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.repository.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
  }

  async deleteById(id: number): Promise<void> {
    await this.repository.delete(id);
  }

  async getUsersByRole(role: UserRole): Promise<User[]> {
    return await this.userRepository.find({
      where: { role, isActive: true },
      select: ["id", "email", "name", "role"],
    });
  }

  async getAllActiveUsers(): Promise<User[]> {
    return await this.userRepository.find({
      where: { isActive: true },
      select: ["id", "email", "name", "role"],
    });
  }

  async getNotificationStats(userId: number): Promise<{
    total: number;
    unread: number;
    byType: { [key in NotificationType]: number };
  }> {
    const total = await this.repository.count({ where: { userId } });
    const unread = await this.repository.count({
      where: { userId, isRead: false },
    });

    // Get count by type
    const byType = {} as { [key in NotificationType]: number };

    for (const type of Object.values(NotificationType)) {
      byType[type] = await this.repository.count({
        where: { userId, type },
      });
    }

    return { total, unread, byType };
  }

  // Admin methods
  async findAllForAdmin(options: {
    page?: number;
    limit?: number;
    targetType?: NotificationTargetType;
    type?: NotificationType;
  }): Promise<{ notifications: Notification[]; total: number }> {
    const { page = 1, limit = 20, targetType, type } = options;
    const skip = (page - 1) * limit;

    const whereConditions: any = {};

    if (targetType) {
      whereConditions.targetType = targetType;
    }

    if (type) {
      whereConditions.type = type;
    }

    const findOptions: FindManyOptions<Notification> = {
      where: whereConditions,
      relations: ["sender", "user"],
      order: { createdAt: "DESC" },
      skip,
      take: limit,
    };

    const [notifications, total] = await this.repository.findAndCount(
      findOptions
    );

    return { notifications, total };
  }

  async getAdminStats(): Promise<{
    totalSent: number;
    totalUsers: number;
    totalUnread: number;
    byType: { [key in NotificationType]: number };
    byTargetType: { [key in NotificationTargetType]: number };
  }> {
    const totalSent = await this.repository.count();
    const totalUsers = await this.userRepository.count({
      where: { isActive: true },
    });
    const totalUnread = await this.repository.count({
      where: { isRead: false },
    });

    // Count by type
    const byType = {} as { [key in NotificationType]: number };
    for (const type of Object.values(NotificationType)) {
      byType[type] = await this.repository.count({ where: { type } });
    }

    // Count by target type
    const byTargetType = {} as { [key in NotificationTargetType]: number };
    for (const targetType of Object.values(NotificationTargetType)) {
      byTargetType[targetType] = await this.repository.count({
        where: { targetType },
      });
    }

    return { totalSent, totalUsers, totalUnread, byType, byTargetType };
  }

  // Bulk operations
  async createMany(
    notifications: Partial<Notification>[]
  ): Promise<Notification[]> {
    const entities = this.repository.create(notifications);
    return await this.repository.save(entities);
  }

  async deleteOldNotifications(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.repository.delete({
      createdAt: { valueOf: () => `< '${cutoffDate.toISOString()}'` } as any,
    });

    return result.affected || 0;
  }
}
