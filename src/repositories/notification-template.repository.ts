import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, IsNull } from "typeorm";
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
    const { page = 1, limit = 20, unreadOnly = false } = options;
    const skip = (page - 1) * limit;

    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ["createdAt"],
    });

    const queryBuilder = this.repository
      .createQueryBuilder("template")
      .leftJoinAndSelect("template.sender", "sender")
      .leftJoin(
        UserNotificationState,
        "state",
        "state.templateId = template.id AND state.userId = :stateUserId",
        { stateUserId: userId }
      )
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
      .andWhere(
        user?.createdAt
          ? "template.createdAt >= :userCreatedAt"
          : "1=1",
        user?.createdAt
          ? {
              userCreatedAt: user.createdAt,
            }
          : undefined
      )
      .andWhere("(template.expiresAt IS NULL OR template.expiresAt > :now)", {
        now: new Date(),
      })
      .andWhere("state.dismissedAt IS NULL");

    if (unreadOnly) {
      queryBuilder.andWhere("state.readAt IS NULL");
    }

    queryBuilder
      .orderBy("template.priority", "DESC")
      .addOrderBy("template.createdAt", "DESC")
      .skip(skip)
      .take(limit);

    const [templates, total] = await queryBuilder.getManyAndCount();
    return { templates, total };
  }

  async findIdsForUser(
    userId: number,
    userRoles: UserRole[]
  ): Promise<number[]> {
    const { templates } = await this.findForUser(userId, userRoles, {
      page: 1,
      limit: 10000,
    });

    return templates.map((template) => template.id);
  }

  async getUnreadCountForUser(
    userId: number,
    userRoles: UserRole[]
  ): Promise<number> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ["createdAt"],
    });

    const result = await this.repository
      .createQueryBuilder("template")
      .leftJoin(
        UserNotificationState,
        "state",
        "state.templateId = template.id AND state.userId = :stateUserId",
        { stateUserId: userId }
      )
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
          userRoles,
        }
      )
      .andWhere(
        user?.createdAt ? "template.createdAt >= :userCreatedAt" : "1=1",
        user?.createdAt ? { userCreatedAt: user.createdAt } : undefined
      )
      .andWhere("(template.expiresAt IS NULL OR template.expiresAt > :now)", {
        now: new Date(),
      })
      .andWhere("state.dismissedAt IS NULL")
      .andWhere("state.readAt IS NULL")
      .getCount();

    return result;
  }

  async findAllForAdmin(
    options: {
      page?: number;
      limit?: number;
      targetType?: NotificationTargetType;
      type?: NotificationType;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<{ templates: NotificationTemplate[]; total: number }> {
    const { page = 1, limit = 20, targetType, type, startDate, endDate } = options;
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

    if (startDate) {
      queryBuilder.andWhere("template.createdAt >= :startDate", {
        startDate: new Date(startDate),
      });
    }

    if (endDate) {
      queryBuilder.andWhere("template.createdAt <= :endDate", {
        endDate: new Date(endDate),
      });
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

  async markAllAsRead(userId: number, templateIds: number[]): Promise<void> {
    if (templateIds.length === 0) return;

    const now = new Date();

    // Step 1: Update existing states with readAt: null to READ
    await this.repository.update(
      { userId, templateId: In(templateIds), readAt: IsNull() },
      {
        state: NotificationState.READ,
        readAt: now,
        updatedAt: now,
      }
    );

    // Step 2: Get existing state template IDs
    const existingStates = await this.repository.find({
      where: { userId, templateId: In(templateIds) },
      select: ['templateId'],
    });
    const existingTemplateIds = existingStates.map((s) => s.templateId);

    // Step 3: Find missing template IDs (templates user hasn't interacted with)
    const missingTemplateIds = templateIds.filter(
      (id) => !existingTemplateIds.includes(id)
    );

    // Step 4: Bulk insert states for missing templates
    if (missingTemplateIds.length > 0) {
      const newStates = missingTemplateIds.map((templateId) => ({
        userId,
        templateId,
        state: NotificationState.READ,
        readAt: now,
        createdAt: now,
        updatedAt: now,
      }));

      await this.repository.insert(newStates);
    }
  }

  async dismiss(templateId: number, userId: number): Promise<boolean> {
    const now = new Date();
    let state = await this.repository.findOne({
      where: { templateId, userId },
    });
    const wasAlreadyDismissed = Boolean(state?.dismissedAt);

    if (state) {
      state.state = NotificationState.DISMISSED;
      state.dismissedAt = now;
      state.updatedAt = now;
    } else {
      state = this.repository.create({
        templateId,
        userId,
        state: NotificationState.DISMISSED,
        dismissedAt: now,
      });
    }

    await this.repository.save(state);
    return !wasAlreadyDismissed;
  }

  async dismissAll(userId: number, templateIds: number[]): Promise<number> {
    if (templateIds.length === 0) return 0;

    const now = new Date();
    const updateResult = await this.repository.update(
      { userId, templateId: In(templateIds), dismissedAt: IsNull() },
      {
        state: NotificationState.DISMISSED,
        dismissedAt: now,
        updatedAt: now,
      }
    );

    const existingStates = await this.repository.find({
      where: { userId, templateId: In(templateIds) },
      select: ["templateId"],
    });
    const existingTemplateIds = existingStates.map((state) => state.templateId);
    const missingTemplateIds = templateIds.filter(
      (id) => !existingTemplateIds.includes(id)
    );

    if (missingTemplateIds.length > 0) {
      await this.repository.insert(
        missingTemplateIds.map((templateId) => ({
          userId,
          templateId,
          state: NotificationState.DISMISSED,
          dismissedAt: now,
          createdAt: now,
          updatedAt: now,
        }))
      );
    }

    return (updateResult.affected || 0) + missingTemplateIds.length;
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
