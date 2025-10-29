import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User, UserRole, UserActivity, ActivityType } from "../entities";

export interface BanUserDto {
  userId: number;
  reason: string;
  bannedBy: number;
}

export interface UserListQuery {
  page?: number;
  limit?: number;
  status?: "active" | "banned" | "all";
  role?: UserRole;
  search?: string;
}

@Injectable()
export class AdminUserService {
  private readonly logger = new Logger(AdminUserService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserActivity)
    private userActivityRepository: Repository<UserActivity>
  ) {}

  // Get users list with filters
  async getUsersList(query: UserListQuery) {
    const { page = 1, limit = 20, status = "all", role, search } = query;

    try {
      const queryBuilder = this.userRepository.createQueryBuilder("user");

      // Filter by status
      if (status === "active") {
        queryBuilder.where("user.isActive = :active", { active: true });
      } else if (status === "banned") {
        queryBuilder.where("user.isActive = :active", { active: false });
      }

      // Filter by role
      if (role) {
        queryBuilder.andWhere("user.role = :role", { role });
      }

      // Search by email or name
      if (search) {
        queryBuilder.andWhere(
          "LOWER(user.email) LIKE LOWER(:search) OR LOWER(user.name) LIKE LOWER(:search)",
          { search: `%${search}%` }
        );
      }

      const [items, total] = await queryBuilder
        .orderBy("user.createdAt", "DESC")
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      // Remove sensitive data
      const sanitizedItems = items.map((user) => {
        const { password, ...rest } = user;
        return rest;
      });

      return {
        items: sanitizedItems,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error("Error getting users list:", error);
      throw error;
    }
  }

  // Get user details with activity
  async getUserDetails(userId: number) {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ["favorites"],
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // Get user activities (last 50)
      const activities = await this.userActivityRepository.find({
        where: { userId },
        order: { createdAt: "DESC" },
        take: 50,
      });

      // Get activity stats
      const activityStats = await this.getUserActivityStats(userId);

      const { password, ...sanitizedUser } = user;

      return {
        user: sanitizedUser,
        activities,
        stats: activityStats,
      };
    } catch (error) {
      this.logger.error("Error getting user details:", error);
      throw error;
    }
  }

  // Ban user
  async banUser(dto: BanUserDto): Promise<User> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: dto.userId },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${dto.userId} not found`);
      }

      user.isActive = false;
      user.bannedReason = dto.reason;
      user.bannedBy = dto.bannedBy;
      user.bannedAt = new Date();

      await this.userRepository.save(user);

      this.logger.log(`User ${dto.userId} banned by admin ${dto.bannedBy}`);

      const { password, ...sanitizedUser } = user;
      return sanitizedUser as User;
    } catch (error) {
      this.logger.error("Error banning user:", error);
      throw error;
    }
  }

  // Unban user
  async unbanUser(userId: number): Promise<User> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      user.isActive = true;
      user.bannedReason = null;
      user.bannedBy = null;
      user.bannedAt = null;

      await this.userRepository.save(user);

      this.logger.log(`User ${userId} unbanned`);

      const { password, ...sanitizedUser } = user;
      return sanitizedUser as User;
    } catch (error) {
      this.logger.error("Error unbanning user:", error);
      throw error;
    }
  }

  // Update user role
  async updateUserRole(userId: number, role: UserRole): Promise<User> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      user.role = role;
      await this.userRepository.save(user);

      this.logger.log(`User ${userId} role updated to ${role}`);

      const { password, ...sanitizedUser } = user;
      return sanitizedUser as User;
    } catch (error) {
      this.logger.error("Error updating user role:", error);
      throw error;
    }
  }

  // Get user stats
  async getUserStats() {
    try {
      const [totalUsers, activeUsers, bannedUsers] = await Promise.all([
        this.userRepository.count(),
        this.userRepository.count({ where: { isActive: true } }),
        this.userRepository.count({ where: { isActive: false } }),
      ]);

      // Count by role
      const adminCount = await this.userRepository.count({
        where: { role: UserRole.ADMIN },
      });
      const superAdminCount = await this.userRepository.count({
        where: { role: UserRole.SUPER_ADMIN },
      });
      const regularUserCount = await this.userRepository.count({
        where: { role: UserRole.USER },
      });

      // Get recent signups (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentSignups = await this.userRepository.count({
        where: {
          createdAt: { $gte: sevenDaysAgo } as any,
        },
      });

      // Get users by provider
      const emailUsers = await this.userRepository.count({
        where: { provider: "email" },
      });
      const googleUsers = await this.userRepository.count({
        where: { provider: "google" },
      });

      return {
        total: totalUsers,
        active: activeUsers,
        banned: bannedUsers,
        byRole: {
          admin: adminCount,
          superAdmin: superAdminCount,
          regularUser: regularUserCount,
        },
        byProvider: {
          email: emailUsers,
          google: googleUsers,
        },
        recentSignups,
      };
    } catch (error) {
      this.logger.error("Error getting user stats:", error);
      throw error;
    }
  }

  // Get user activity stats
  private async getUserActivityStats(userId: number) {
    try {
      const totalActivities = await this.userActivityRepository.count({
        where: { userId },
      });

      const loginCount = await this.userActivityRepository.count({
        where: { userId, activityType: ActivityType.LOGIN },
      });

      const searchCount = await this.userActivityRepository.count({
        where: { userId, activityType: ActivityType.SEARCH },
      });

      const viewCount = await this.userActivityRepository.count({
        where: { userId, activityType: ActivityType.VIEW_CONTENT },
      });

      const favoriteCount = await this.userActivityRepository.count({
        where: { userId, activityType: ActivityType.FAVORITE_ADD },
      });

      // Get last login
      const lastLogin = await this.userActivityRepository.findOne({
        where: { userId, activityType: ActivityType.LOGIN },
        order: { createdAt: "DESC" },
      });

      return {
        total: totalActivities,
        logins: loginCount,
        searches: searchCount,
        views: viewCount,
        favorites: favoriteCount,
        lastLogin: lastLogin?.createdAt || null,
      };
    } catch (error) {
      this.logger.error("Error getting user activity stats:", error);
      return {
        total: 0,
        logins: 0,
        searches: 0,
        views: 0,
        favorites: 0,
        lastLogin: null,
      };
    }
  }
}
