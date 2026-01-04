import { Injectable, ForbiddenException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserLog } from "../entities/user-log.entity";
import { UserRole } from "../entities/user.entity";

export interface LogActionParams {
  userId: number;
  action: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface LogUserUpdateParams {
  userId: number;
  updatedBy: number;
  oldData: any;
  newData: any;
  ipAddress?: string;
  userAgent?: string;
}

export interface LogLoginParams {
  userId: number;
  ipAddress?: string;
  userAgent?: string;
  country?: string;
  device?: string;
}

export interface LogMovieWatchParams {
  userId: number;
  movieId: number;
  movieTitle: string;
  watchDuration: number;
  ipAddress?: string;
}

export interface LogFavoriteParams {
  userId: number;
  action: "ADD" | "REMOVE";
  movieId: number;
  movieTitle: string;
}

export interface LogCommentParams {
  userId: number;
  action: "CREATE" | "UPDATE" | "DELETE";
  commentId: number;
  movieId: number;
  content?: string;
}

export interface LogSearchParams {
  userId: number;
  query: string;
  resultsCount: number;
}

@Injectable()
export class UserActivityLoggerService {
  constructor(
    @InjectRepository(UserLog)
    private userLogRepository: Repository<UserLog>
  ) {}

  /**
   * Log user action with detailed payload
   */
  async logAction(params: LogActionParams): Promise<UserLog> {
    const log = this.userLogRepository.create({
      userId: params.userId,
      action: params.action,
      description: params.description,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: params.metadata,
    });

    return await this.userLogRepository.save(log);
  }

  /**
   * Get logs of a user (only admin/viewer)
   */
  async getUserLogs(
    userId: number,
    requesterRole: UserRole
  ): Promise<UserLog[]> {
    // Permission check
    if (
      ![UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.VIEWER].includes(
        requesterRole
      )
    ) {
      throw new ForbiddenException(
        "Permission denied: Only admin and viewer can view logs"
      );
    }

    return await this.userLogRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
      take: 100, // Limit to 100 most recent logs
    });
  }

  /**
   * Helper: Log user update action
   */
  async logUserUpdate(params: LogUserUpdateParams): Promise<UserLog> {
    const changes = this.getChangedFields(params.oldData, params.newData);

    return await this.logAction({
      userId: params.userId,
      action: "USER_UPDATE",
      description: `User profile updated by admin (ID: ${params.updatedBy})`,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: {
        updatedBy: params.updatedBy,
        changes: changes,
        oldData: params.oldData,
        newData: params.newData,
      },
    });
  }

  /**
   * Helper: Log login action
   */
  async logLogin(params: LogLoginParams): Promise<UserLog> {
    return await this.logAction({
      userId: params.userId,
      action: "LOGIN",
      description: `User logged in from ${params.device || "unknown device"}`,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: {
        country: params.country,
        device: params.device,
        loginTime: new Date().toISOString(),
      },
    });
  }

  /**
   * Helper: Log movie watch action
   */
  async logMovieWatch(params: LogMovieWatchParams): Promise<UserLog> {
    return await this.logAction({
      userId: params.userId,
      action: "WATCH_MOVIE",
      description: `Watched "${params.movieTitle}" for ${Math.floor(params.watchDuration / 60)} minutes`,
      ipAddress: params.ipAddress,
      metadata: {
        movieId: params.movieId,
        movieTitle: params.movieTitle,
        watchDuration: params.watchDuration,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Helper: Log favorite action
   */
  async logFavoriteAction(params: LogFavoriteParams): Promise<UserLog> {
    return await this.logAction({
      userId: params.userId,
      action: params.action === "ADD" ? "FAVORITE_ADD" : "FAVORITE_REMOVE",
      description: `${params.action === "ADD" ? "Added" : "Removed"} "${params.movieTitle}" ${params.action === "ADD" ? "to" : "from"} favorites`,
      metadata: {
        movieId: params.movieId,
        movieTitle: params.movieTitle,
        action: params.action,
      },
    });
  }

  /**
   * Helper: Log comment action
   */
  async logComment(params: LogCommentParams): Promise<UserLog> {
    const actionText = {
      CREATE: "Posted",
      UPDATE: "Updated",
      DELETE: "Deleted",
    };

    return await this.logAction({
      userId: params.userId,
      action: `COMMENT_${params.action}`,
      description: `${actionText[params.action]} a comment on movie ID: ${params.movieId}`,
      metadata: {
        commentId: params.commentId,
        movieId: params.movieId,
        content: params.content,
        action: params.action,
      },
    });
  }

  /**
   * Helper: Log search action
   */
  async logSearch(params: LogSearchParams): Promise<UserLog> {
    return await this.logAction({
      userId: params.userId,
      action: "SEARCH",
      description: `Searched for "${params.query}" (${params.resultsCount} results)`,
      metadata: {
        query: params.query,
        resultsCount: params.resultsCount,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Private: Get changed fields between old and new data
   */
  private getChangedFields(
    oldData: any,
    newData: any
  ): Record<string, { old: any; new: any }> {
    const changes: Record<string, { old: any; new: any }> = {};

    for (const key in newData) {
      if (oldData[key] !== newData[key]) {
        changes[key] = {
          old: oldData[key],
          new: newData[key],
        };
      }
    }

    return changes;
  }
}
