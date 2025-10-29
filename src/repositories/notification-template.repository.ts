import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import {
  NotificationTemplate,
  NotificationType,
  NotificationTargetType,
} from "../entities/notification-template.entity";
import {
  UserNotificationState,
  NotificationState,
} from "../entities/user-notification-state.entity";
import { NotificationAnalytics } from "../entities/notification-analytics.entity";
import { User, UserRole } from "../entities/user.entity";

@Injectable()
export class NotificationTemplateRepository {
  constructor(
    @InjectRepository(NotificationTemplate)
    private repository: Repository<NotificationTemplate>,
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  async create(
    data: Partial<NotificationTemplate>
  ): Promise<NotificationTemplate> {
    const template = this.repository.create(data);
    return await this.repository.save(template);
  }

  async findById(id: number): Promise<NotificationTemplate> {
    return await this.repository.findOne({
      where: { id },
      relations: ["sender"],
    });
  }

  async findForUser(
    userId: number,
    userRoles: UserRole[],
    options: {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
    } = {}
  ): Promise<{ templates: NotificationTemplate[]; total: number }> {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const queryBuilder = this.repository
      .createQueryBuilder("template")
      .leftJoinAndSelect("template.sender", "sender")
      .where(
        `(
          template.targetType = :all OR 
          (template.targetType = :user AND template.targetValue = :userId) OR
          (template.targetType = :role AND template.targetValue IN (:...userRoles))
        )`,
        {
          all: NotificationTargetType.ALL,
          user: NotificationTargetType.USER,
          role: NotificationTargetType.ROLE,
          userId: userId.toString(),
          userRoles: userRoles,
        }
      )
      .andWhere("(template.expiresAt IS NULL OR template.expiresAt > :now)", {
        now: new Date(),
      })
      .orderBy("template.priority", "DESC")
      .addOrderBy("template.createdAt", "DESC")
      .skip(skip)
      .take(limit);

    const [templates, total] = await queryBuilder.getManyAndCount();
    return { templates, total };
  }

  async findAllForAdmin(
    options: {
      page?: number;
      limit?: number;
      targetType?: NotificationTargetType;
      type?: NotificationType;
    } = {}
  ): Promise<{ templates: NotificationTemplate[]; total: number }> {
    const { page = 1, limit = 20, targetType, type } = options;
    const skip = (page - 1) * limit;

    const queryBuilder = this.repository
      .createQueryBuilder("template")
      .leftJoinAndSelect("template.sender", "sender")
      .orderBy("template.createdAt", "DESC")
      .skip(skip)
      .take(limit);

    if (targetType) {
      queryBuilder.andWhere("template.targetType = :targetType", {
        targetType,
      });
    }

    if (type) {
      queryBuilder.andWhere("template.type = :type", { type });
    }

    const [templates, total] = await queryBuilder.getManyAndCount();
    return { templates, total };
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

  async deleteById(id: number): Promise<void> {
    await this.repository.delete(id);
  }
}

@Injectable()
export class UserNotificationStateRepository {
  constructor(
    @InjectRepository(UserNotificationState)
    private repository: Repository<UserNotificationState>
  ) {}

  async findByUserAndTemplates(
    userId: number,
    templateIds: number[]
  ): Promise<UserNotificationState[]> {
    return await this.repository.find({
      where: {
        userId,
        templateId: In(templateIds),
      },
    });
  }

  async markAsRead(
    templateId: number,
    userId: number
  ): Promise<UserNotificationState> {
    // Try to find existing state
    let state = await this.repository.findOne({
      where: { templateId, userId },
    });

    if (state) {
      // Update existing state
      state.state = NotificationState.READ;
      state.readAt = new Date();
      state.updatedAt = new Date();
    } else {
      // Create new state
      state = this.repository.create({
        templateId,
        userId,
        state: NotificationState.READ,
        readAt: new Date(),
      });
    }

    return await this.repository.save(state);
  }

  async markAllAsRead(userId: number): Promise<void> {
    // This is more complex in template system - we'd need to get all applicable templates first
    // For now, update existing states and let unread count calculation handle the rest
    await this.repository.update(
      { userId, readAt: null },
      {
        state: NotificationState.READ,
        readAt: new Date(),
        updatedAt: new Date(),
      }
    );
  }

  async getUnreadCount(
    userId: number,
    applicableTemplateIds: number[]
  ): Promise<number> {
    if (applicableTemplateIds.length === 0) return 0;

    // Count templates that user hasn't read
    const readStates = await this.repository.count({
      where: {
        userId,
        templateId: In(applicableTemplateIds),
        readAt: null, // Not null = read
      },
    });

    // Unread = total applicable - read states
    return Math.max(0, applicableTemplateIds.length - readStates);
  }
}

@Injectable()
export class NotificationAnalyticsRepository {
  constructor(
    @InjectRepository(NotificationAnalytics)
    private repository: Repository<NotificationAnalytics>
  ) {}

  async create(
    data: Partial<NotificationAnalytics>
  ): Promise<NotificationAnalytics> {
    const analytics = this.repository.create(data);
    return await this.repository.save(analytics);
  }

  async findByTemplateId(templateId: number): Promise<NotificationAnalytics> {
    return await this.repository.findOne({
      where: { templateId },
    });
  }

  async incrementReadCount(templateId: number): Promise<void> {
    await this.repository.increment({ templateId }, "readCount", 1);
  }

  async incrementDismissedCount(templateId: number): Promise<void> {
    await this.repository.increment({ templateId }, "dismissedCount", 1);
  }

  async incrementClickCount(templateId: number): Promise<void> {
    await this.repository.increment({ templateId }, "clickCount", 1);
  }

  async getAdminStats(): Promise<{
    totalSent: number;
    totalUsers: number;
    totalUnread: number;
    totalRead: number;
  }> {
    const result = await this.repository
      .createQueryBuilder("analytics")
      .select("SUM(analytics.deliveredCount)", "totalSent")
      .addSelect("SUM(analytics.totalTargetedUsers)", "totalUsers")
      .addSelect("SUM(analytics.readCount)", "totalRead")
      .addSelect(
        "SUM(analytics.deliveredCount - analytics.readCount)",
        "totalUnread"
      )
      .getRawOne();

    return {
      totalSent: parseInt(result.totalSent) || 0,
      totalUsers: parseInt(result.totalUsers) || 0,
      totalRead: parseInt(result.totalRead) || 0,
      totalUnread: parseInt(result.totalUnread) || 0,
    };
  }
}
