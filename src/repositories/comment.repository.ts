import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository, SelectQueryBuilder } from "typeorm";
import {
  Comment,
  CommentLike,
  BannedWord,
  CommentReport,
  BannedWordAction,
  ReportStatus,
  CommentMention,
} from "../entities/comment.entity";
import { User } from "../entities/user.entity";

export interface CommentQueryOptions {
  page?: number;
  limit?: number;
  sortBy?: "newest" | "oldest" | "popular";
  includeHidden?: boolean;
  userId?: number; // For filtering user's own comments
}

export interface CommentWithUserLike extends Comment {
  userLike?: boolean | null; // User's like status (true=like, false=dislike, null=no interaction)
}

@Injectable()
export class CommentRepository {
  constructor(
    @InjectRepository(Comment)
    private repository: Repository<Comment>,
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  // ✅ CORE CRUD OPERATIONS
  async create(data: Partial<Comment>): Promise<Comment> {
    const comment = this.repository.create(data);
    const savedComment = await this.repository.save(comment);

    // Load the user relation to avoid undefined errors
    return await this.repository.findOne({
      where: { id: savedComment.id },
      relations: ["user", "mentions", "mentions.mentionedUser"],
    });
  }

  async findById(
    id: number,
    userId?: number
  ): Promise<CommentWithUserLike | null> {
    const queryBuilder = this.repository
      .createQueryBuilder("comment")
      .leftJoinAndSelect("comment.user", "user")
      .leftJoinAndSelect("comment.mentions", "mentions")
      .leftJoinAndSelect("mentions.mentionedUser", "mentionedUser")
      .where("comment.id = :id", { id });

    // Add user like information if userId provided
    if (userId) {
      queryBuilder
        .leftJoin("comment.likes", "userLike", "userLike.userId = :userId", {
          userId,
        })
        .addSelect("userLike.isLike", "userLike");
    }

    const result = await queryBuilder.getRawAndEntities();
    if (!result.entities.length) return null;

    const comment = result.entities[0] as CommentWithUserLike;
    if (userId && result.raw[0]) {
      comment.userLike = result.raw[0].userLike;
    }

    return comment;
  }

  async findByContent(
    movieId?: number,
    tvId?: number,
    options: CommentQueryOptions = {}
  ): Promise<{ comments: CommentWithUserLike[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      sortBy = "newest",
      includeHidden = false,
      userId,
    } = options;

    const skip = (page - 1) * limit;

    let queryBuilder = this.repository
      .createQueryBuilder("comment")
      .leftJoinAndSelect("comment.user", "user")
      .where("comment.parentId IS NULL") // Only top-level comments
      .leftJoinAndSelect("comment.mentions", "mentions")
      .leftJoinAndSelect("mentions.mentionedUser", "mentionedUser");

    // Filter by content type
    if (movieId) {
      queryBuilder = queryBuilder.andWhere("comment.movieId = :movieId", {
        movieId,
      });
    } else if (tvId) {
      queryBuilder = queryBuilder.andWhere("comment.tvId = :tvId", { tvId });
    }

    // Hide deleted/hidden comments unless specifically requested
    if (!includeHidden) {
      queryBuilder = queryBuilder
        .andWhere("comment.isDeleted = false")
        .andWhere("comment.isHidden = false");
    }

    // Add user like information if userId provided
    if (userId) {
      queryBuilder = queryBuilder
        .leftJoin("comment.likes", "userLike", "userLike.userId = :userId", {
          userId,
        })
        .addSelect("userLike.isLike", "userLike");
    }

    // Apply sorting
    switch (sortBy) {
      case "oldest":
        queryBuilder = queryBuilder.orderBy("comment.createdAt", "ASC");
        break;
      case "popular":
        queryBuilder = queryBuilder.orderBy("comment.likeCount", "DESC");
        break;
      case "newest":
      default:
        queryBuilder = queryBuilder.orderBy("comment.createdAt", "DESC");
        break;
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    queryBuilder = queryBuilder.skip(skip).take(limit);

    const result = await queryBuilder.getRawAndEntities();
    const comments = result.entities.map((comment, index) => {
      const commentWithLike = comment as CommentWithUserLike;
      if (userId && result.raw[index]) {
        commentWithLike.userLike = result.raw[index].userLike;
      }
      return commentWithLike;
    });

    return { comments, total };
  }

  async findReplies(
    parentId: number,
    options: CommentQueryOptions = {}
  ): Promise<{ comments: CommentWithUserLike[]; total: number }> {
    const { page = 1, limit = 10, includeHidden = false, userId } = options;

    const skip = (page - 1) * limit;

    let queryBuilder = this.repository
      .createQueryBuilder("comment")
      .leftJoinAndSelect("comment.user", "user")
      .leftJoinAndSelect("comment.mentions", "mentions")
      .leftJoinAndSelect("mentions.mentionedUser", "mentionedUser")
      .where("comment.parentId = :parentId", { parentId });

    // Hide deleted/hidden comments unless specifically requested
    if (!includeHidden) {
      queryBuilder = queryBuilder
        .andWhere("comment.isDeleted = false")
        .andWhere("comment.isHidden = false");
    }

    // Add user like information if userId provided
    if (userId) {
      queryBuilder = queryBuilder
        .leftJoin("comment.likes", "userLike", "userLike.userId = :userId", {
          userId,
        })
        .addSelect("userLike.isLike", "userLike");
    }

    // Order by creation time (oldest first for replies)
    queryBuilder = queryBuilder.orderBy("comment.createdAt", "ASC");

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    queryBuilder = queryBuilder.skip(skip).take(limit);

    const result = await queryBuilder.getRawAndEntities();
    const comments = result.entities.map((comment, index) => {
      const commentWithLike = comment as CommentWithUserLike;
      if (userId && result.raw[index]) {
        commentWithLike.userLike = result.raw[index].userLike;
      }
      return commentWithLike;
    });

    return { comments, total };
  }

  async updateComment(
    id: number,
    data: Partial<Comment>
  ): Promise<Comment | null> {
    await this.repository.update(id, data);
    return await this.repository.findOne({
      where: { id },
      relations: ["user", "mentions", "mentions.mentionedUser"],
    });
  }

  async deleteComment(id: number, softDelete = true): Promise<boolean> {
    if (softDelete) {
      const result = await this.repository.update(id, { isDeleted: true });
      return result.affected > 0;
    } else {
      const result = await this.repository.delete(id);
      return result.affected > 0;
    }
  }

  async hideComment(
    id: number,
    hiddenBy: number,
    reason?: string
  ): Promise<boolean> {
    const result = await this.repository.update(id, {
      isHidden: true,
      hiddenBy,
      hiddenReason: reason,
    });
    return result.affected > 0;
  }

  async unhideComment(id: number): Promise<boolean> {
    const result = await this.repository.update(id, {
      isHidden: false,
      hiddenBy: null,
      hiddenReason: null,
    });
    return result.affected > 0;
  }

  async incrementReplyCount(id: number): Promise<boolean> {
    const result = await this.repository.increment({ id }, "replyCount", 1);
    return result.affected > 0;
  }

  async decrementReplyCount(id: number): Promise<boolean> {
    const result = await this.repository.decrement({ id }, "replyCount", 1);
    return result.affected > 0;
  }

  // ✅ USER INTERACTION METHODS
  async getUserComments(
    userId: number,
    options: CommentQueryOptions = {}
  ): Promise<{ comments: Comment[]; total: number }> {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [comments, total] = await this.repository.findAndCount({
      where: {
        userId,
        isDeleted: false,
      },
      relations: ["user", "mentions", "mentions.mentionedUser"],
      order: { createdAt: "DESC" },
      skip,
      take: limit,
    });

    return { comments, total };
  }

  async getCommentStats(
    contentId: number,
    isMovie: boolean
  ): Promise<{
    totalComments: number;
    totalReplies: number;
    avgRating: number;
  }> {
    const whereClause = isMovie ? { movieId: contentId } : { tvId: contentId };

    const totalComments = await this.repository.count({
      where: {
        ...whereClause,
        parentId: null,
        isDeleted: false,
        isHidden: false,
      },
    });

    const totalReplies = await this.repository.count({
      where: {
        ...whereClause,
        parentId: { not: null } as any,
        isDeleted: false,
        isHidden: false,
      },
    });

    return {
      totalComments,
      totalReplies,
      avgRating: 0, // Could calculate based on likes/dislikes
    };
  }

  async findUsersByNames(usernames: string[]): Promise<User[]> {
    if (!usernames.length) {
      return [];
    }

    return await this.userRepository.find({
      where: { name: In(usernames) },
    });
  }

  async findUsersByNamePrefix(prefix: string, limit: number = 10): Promise<User[]> {
    if (!prefix) {
      return [];
    }

    return await this.userRepository
      .createQueryBuilder("user")
      .where("LOWER(user.name) LIKE LOWER(:prefix)", { prefix: `${prefix}%` })
      .orderBy("user.name", "ASC")
      .limit(limit)
      .getMany();
  }

  async fixReplyCounts(): Promise<{ fixed: number; total: number }> {
    // Get all comments with parent_id
    const allComments = await this.repository.find();

    // Count replies for each parent comment
    const replyCountMap = new Map<number, number>();

    for (const comment of allComments) {
      if (comment.parentId) {
        const currentCount = replyCountMap.get(comment.parentId) || 0;
        replyCountMap.set(comment.parentId, currentCount + 1);
      }
    }

    // Update all parent comments with correct reply counts
    let fixed = 0;
    for (const [parentId, count] of replyCountMap.entries()) {
      const parent = await this.repository.findOne({ where: { id: parentId } });
      if (parent && parent.replyCount !== count) {
        await this.repository.update(parentId, { replyCount: count });
        fixed++;
      }
    }

    return { fixed, total: replyCountMap.size };
  }

  async fixLikeCounts(): Promise<{ fixed: number; total: number }> {
    const allComments = await this.repository.find();
    const commentLikeRepo = this.repository.manager.getRepository("comment_likes");

    let fixed = 0;

    for (const comment of allComments) {
      // Count actual likes and dislikes from comment_likes table
      const likes = await commentLikeRepo.count({
        where: { commentId: comment.id, isLike: true },
      });

      const dislikes = await commentLikeRepo.count({
        where: { commentId: comment.id, isLike: false },
      });

      // Update if different
      if (comment.likeCount !== likes || comment.dislikeCount !== dislikes) {
        await this.repository.update(comment.id, {
          likeCount: likes,
          dislikeCount: dislikes,
        });
        fixed++;
      }
    }

    return { fixed, total: allComments.length };
  }
}

@Injectable()
export class CommentLikeRepository {
  constructor(
    @InjectRepository(CommentLike)
    private repository: Repository<CommentLike>
  ) {}

  async findUserLike(
    commentId: number,
    userId: number
  ): Promise<CommentLike | null> {
    return await this.repository.findOne({
      where: { commentId, userId },
    });
  }

  async likeComment(
    commentId: number,
    userId: number,
    isLike: boolean
  ): Promise<CommentLike> {
    const commentRepo = this.repository.manager.getRepository("comments");

    // Check if user already liked/disliked this comment
    const existingLike = await this.findUserLike(commentId, userId);

    if (existingLike) {
      // If changing from like to dislike or vice versa
      if (existingLike.isLike !== isLike) {
        existingLike.isLike = isLike;
        const saved = await this.repository.save(existingLike);

        // Update counts: decrement old, increment new
        if (isLike) {
          // Changed from dislike to like
          await commentRepo.decrement({ id: commentId }, "dislikeCount", 1);
          await commentRepo.increment({ id: commentId }, "likeCount", 1);
        } else {
          // Changed from like to dislike
          await commentRepo.decrement({ id: commentId }, "likeCount", 1);
          await commentRepo.increment({ id: commentId }, "dislikeCount", 1);
        }

        return saved;
      }

      // Same action, no change needed
      return existingLike;
    } else {
      // Create new like/dislike
      const newLike = this.repository.create({
        commentId,
        userId,
        isLike,
      });
      const saved = await this.repository.save(newLike);

      // Increment appropriate count
      if (isLike) {
        await commentRepo.increment({ id: commentId }, "likeCount", 1);
      } else {
        await commentRepo.increment({ id: commentId }, "dislikeCount", 1);
      }

      return saved;
    }
  }

  async removeLike(commentId: number, userId: number): Promise<boolean> {
    const commentRepo = this.repository.manager.getRepository("comments");

    // Get the like before deleting to know which count to decrement
    const existingLike = await this.findUserLike(commentId, userId);
    if (!existingLike) {
      return false;
    }

    const result = await this.repository.delete({ commentId, userId });

    if (result.affected > 0) {
      // Get current comment to check counts
      const comment = await commentRepo.findOne({ where: { id: commentId } });

      // Decrement appropriate count only if > 0
      if (existingLike.isLike && comment?.likeCount > 0) {
        await commentRepo.decrement({ id: commentId }, "likeCount", 1);
      } else if (!existingLike.isLike && comment?.dislikeCount > 0) {
        await commentRepo.decrement({ id: commentId }, "dislikeCount", 1);
      }
    }

    return result.affected > 0;
  }

  async getUserLikes(
    userId: number,
    commentIds: number[]
  ): Promise<CommentLike[]> {
    if (commentIds.length === 0) return [];

    return await this.repository.find({
      where: {
        userId,
        commentId: { in: commentIds } as any,
      },
    });
  }
}

@Injectable()
export class BannedWordRepository {
  constructor(
    @InjectRepository(BannedWord)
    private repository: Repository<BannedWord>
  ) {}

  async findAll(): Promise<BannedWord[]> {
    return await this.repository.find({
      order: { severity: "DESC", word: "ASC" },
    });
  }

  async addWord(
    word: string,
    severity: string,
    action: BannedWordAction,
    createdBy?: number
  ): Promise<BannedWord> {
    const bannedWord = this.repository.create({
      word: word.toLowerCase(),
      severity: severity as any,
      action,
      createdBy,
    });
    return await this.repository.save(bannedWord);
  }

  async removeWord(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected > 0;
  }

  async findByAction(action: BannedWordAction): Promise<BannedWord[]> {
    return await this.repository.find({
      where: { action },
      order: { word: "ASC" },
    });
  }
}

@Injectable()
export class CommentReportRepository {
  constructor(
    @InjectRepository(CommentReport)
    private repository: Repository<CommentReport>
  ) {}

  async createReport(data: Partial<CommentReport>): Promise<CommentReport> {
    const report = this.repository.create(data);
    return await this.repository.save(report);
  }

  async findPendingReports(): Promise<CommentReport[]> {
    return await this.repository.find({
      where: { status: ReportStatus.PENDING },
      relations: ["comment", "comment.user", "reporter"],
      order: { createdAt: "DESC" },
    });
  }

  async resolveReport(id: number, reviewedBy: number): Promise<boolean> {
    const result = await this.repository.update(id, {
      status: ReportStatus.RESOLVED,
      reviewedBy,
      resolvedAt: new Date(),
    });
    return result.affected > 0;
  }

  async findByComment(commentId: number): Promise<CommentReport[]> {
    return await this.repository.find({
      where: { commentId },
      relations: ["reporter"],
      order: { createdAt: "DESC" },
    });
  }
}

@Injectable()
export class CommentMentionRepository {
  constructor(
    @InjectRepository(CommentMention)
    private repository: Repository<CommentMention>
  ) {}

  async replaceMentions(
    commentId: number,
    mentionedUserIds: number[]
  ): Promise<void> {
    await this.repository.delete({ commentId });

    if (!mentionedUserIds.length) {
      return;
    }

    const mentions = mentionedUserIds.map((userId) =>
      this.repository.create({
        commentId,
        mentionedUserId: userId,
      })
    );

    await this.repository.save(mentions);
  }

  async findByComment(commentId: number): Promise<CommentMention[]> {
    return await this.repository.find({
      where: { commentId },
      relations: ["mentionedUser"],
    });
  }
}
