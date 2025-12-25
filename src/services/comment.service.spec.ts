import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';

// Mock entity modules to avoid TypeORM errors
vi.mock('../entities/comment.entity', () => ({
  Comment: class Comment {},
  CommentLike: class CommentLike {},
  CommentReport: class CommentReport {},
  ReportReason: {
    SPAM: 'spam',
    INAPPROPRIATE: 'inappropriate',
    HARASSMENT: 'harassment',
  },
  ReportStatus: {
    PENDING: 'pending',
    REVIEWED: 'reviewed',
  },
}));

vi.mock('../entities/user.entity', () => ({
  User: class User {},
  UserRole: {
    USER: 'user',
    ADMIN: 'admin',
  },
}));

vi.mock('../entities/notification-template.entity', () => ({
  NotificationType: {
    INFO: 'info',
    WARNING: 'warning',
  },
}));

const { CommentService } = await import('./comment.service');

describe('CommentService', () => {
  let service: CommentService;
  let commentRepository: any;
  let commentLikeRepository: any;
  let commentReportRepository: any;
  let commentMentionRepository: any;
  let contentFilterService: any;
  let notificationService: any;

  beforeEach(() => {
    // Mock repositories
    commentRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByContent: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      incrementReplyCount: vi.fn(),
    };

    commentLikeRepository = {
      findByUserAndComment: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    };

    commentReportRepository = {
      createReport: vi.fn(),
    };

    commentMentionRepository = {
      createMention: vi.fn(),
      findByComment: vi.fn().mockResolvedValue([]),
    };

    // Mock services
    contentFilterService = {
      validateCommentLength: vi.fn(),
      validateUserRateLimit: vi.fn(),
      filterContent: vi.fn(),
    };

    notificationService = {
      createUserNotification: vi.fn(),
    };

    service = new CommentService(
      commentRepository,
      commentLikeRepository,
      commentReportRepository,
      commentMentionRepository,
      contentFilterService,
      notificationService
    );
  });

  describe('createComment', () => {
    it('should create comment successfully for movie', async () => {
      const dto = {
        content: 'Great movie!',
        movieId: 123,
      };
      const userId = 1;

      const createdComment = {
        id: 1,
        content: 'Great movie!',
        userId,
        movieId: 123,
        tvId: null,
        parentId: null,
        isHidden: false,
        createdAt: new Date(),
        user: { id: 1, name: 'Test User' },
      };

      contentFilterService.validateCommentLength.mockReturnValue({
        isValid: true,
      });
      contentFilterService.validateUserRateLimit.mockReturnValue({
        isValid: true,
      });
      contentFilterService.filterContent.mockResolvedValue({
        filteredContent: 'Great movie!',
        action: 'allow',
        hasViolations: false,
        violations: [],
      });
      commentRepository.create.mockResolvedValue(createdComment);
      commentRepository.findById.mockResolvedValue(createdComment);

      const result = await service.createComment(dto, userId);

      expect(result).toBeDefined();
      expect(commentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Great movie!',
          userId,
          movieId: 123,
        })
      );
    });

    it('should create comment successfully for TV show', async () => {
      const dto = {
        content: 'Amazing series!',
        tvId: 456,
      };
      const userId = 1;

      const createdComment = {
        id: 2,
        content: 'Amazing series!',
        userId,
        movieId: null,
        tvId: 456,
        user: { id: 1, name: 'Test User' },
      };

      contentFilterService.validateCommentLength.mockReturnValue({
        isValid: true,
      });
      contentFilterService.validateUserRateLimit.mockReturnValue({
        isValid: true,
      });
      contentFilterService.filterContent.mockResolvedValue({
        filteredContent: 'Amazing series!',
        action: 'allow',
        hasViolations: false,
        violations: [],
      });
      commentRepository.create.mockResolvedValue(createdComment);
      commentRepository.findById.mockResolvedValue(createdComment);

      const result = await service.createComment(dto, userId);

      expect(result).toBeDefined();
      expect(commentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tvId: 456,
        })
      );
    });

    it('should throw error if comment is too long', async () => {
      const dto = {
        content: 'a'.repeat(10000),
        movieId: 123,
      };
      const userId = 1;

      contentFilterService.validateCommentLength.mockReturnValue({
        isValid: false,
        message: 'Comment is too long',
      });

      await expect(service.createComment(dto, userId)).rejects.toThrow(BadRequestException);
      await expect(service.createComment(dto, userId)).rejects.toThrow('Comment is too long');
    });

    it('should throw error if user is rate limited', async () => {
      const dto = {
        content: 'Great movie!',
        movieId: 123,
      };
      const userId = 1;

      contentFilterService.validateCommentLength.mockReturnValue({
        isValid: true,
      });
      contentFilterService.validateUserRateLimit.mockReturnValue({
        isValid: false,
        message: 'Too many comments. Please wait.',
      });

      await expect(service.createComment(dto, userId)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if content contains prohibited words', async () => {
      const dto = {
        content: 'This contains bad words',
        movieId: 123,
      };
      const userId = 1;

      contentFilterService.validateCommentLength.mockReturnValue({
        isValid: true,
      });
      contentFilterService.validateUserRateLimit.mockReturnValue({
        isValid: true,
      });
      contentFilterService.filterContent.mockResolvedValue({
        filteredContent: 'This contains *** words',
        action: 'block',
        hasViolations: true,
        violations: ['profanity'],
      });

      await expect(service.createComment(dto, userId)).rejects.toThrow(BadRequestException);
      await expect(service.createComment(dto, userId)).rejects.toThrow('prohibited content');
    });

    it('should throw error if both movieId and tvId provided', async () => {
      const dto = {
        content: 'Great!',
        movieId: 123,
        tvId: 456,
      };
      const userId = 1;

      contentFilterService.validateCommentLength.mockReturnValue({
        isValid: true,
      });
      contentFilterService.validateUserRateLimit.mockReturnValue({
        isValid: true,
      });
      contentFilterService.filterContent.mockResolvedValue({
        filteredContent: 'Great!',
        action: 'allow',
        hasViolations: false,
        violations: [],
      });

      await expect(service.createComment(dto, userId)).rejects.toThrow(BadRequestException);
      await expect(service.createComment(dto, userId)).rejects.toThrow('not both');
    });

    it('should throw error if neither movieId nor tvId provided', async () => {
      const dto = {
        content: 'Great!',
      };
      const userId = 1;

      contentFilterService.validateCommentLength.mockReturnValue({
        isValid: true,
      });
      contentFilterService.validateUserRateLimit.mockReturnValue({
        isValid: true,
      });
      contentFilterService.filterContent.mockResolvedValue({
        filteredContent: 'Great!',
        action: 'allow',
        hasViolations: false,
        violations: [],
      });

      await expect(service.createComment(dto, userId)).rejects.toThrow(BadRequestException);
    });

    it('should create reply to parent comment', async () => {
      const dto = {
        content: 'I agree!',
        movieId: 123,
        parentId: 10,
      };
      const userId = 2;

      const parentComment = {
        id: 10,
        content: 'Great movie!',
        userId: 1,
        movieId: 123,
      };

      const createdReply = {
        id: 11,
        content: 'I agree!',
        userId: 2,
        movieId: 123,
        parentId: 10,
        user: { id: 2, name: 'User 2' },
      };

      contentFilterService.validateCommentLength.mockReturnValue({
        isValid: true,
      });
      contentFilterService.validateUserRateLimit.mockReturnValue({
        isValid: true,
      });
      contentFilterService.filterContent.mockResolvedValue({
        filteredContent: 'I agree!',
        action: 'allow',
        hasViolations: false,
        violations: [],
      });
      commentRepository.findById.mockResolvedValueOnce(parentComment);
      commentRepository.create.mockResolvedValue(createdReply);
      commentRepository.findById.mockResolvedValueOnce(createdReply);

      await service.createComment(dto, userId);

      expect(commentRepository.incrementReplyCount).toHaveBeenCalledWith(10);
      expect(notificationService.createUserNotification).toHaveBeenCalled();
    });

    it('should throw error if parent comment not found', async () => {
      const dto = {
        content: 'Reply',
        movieId: 123,
        parentId: 999,
      };
      const userId = 1;

      contentFilterService.validateCommentLength.mockReturnValue({
        isValid: true,
      });
      contentFilterService.validateUserRateLimit.mockReturnValue({
        isValid: true,
      });
      contentFilterService.filterContent.mockResolvedValue({
        filteredContent: 'Reply',
        action: 'allow',
        hasViolations: false,
        violations: [],
      });
      commentRepository.findById.mockResolvedValue(null);

      await expect(service.createComment(dto, userId)).rejects.toThrow(NotFoundException);
      await expect(service.createComment(dto, userId)).rejects.toThrow('Parent comment not found');
    });
  });

  describe('getCommentsByContent', () => {
    it('should get comments for movie', async () => {
      const movieId = 123;
      const options = { page: 1, limit: 10 };
      const userId = 1;

      const mockComments = [
        {
          id: 1,
          content: 'Great!',
          userId: 1,
          movieId,
          user: { id: 1, name: 'User 1' },
        },
        {
          id: 2,
          content: 'Amazing!',
          userId: 2,
          movieId,
          user: { id: 2, name: 'User 2' },
        },
      ];

      commentRepository.findByContent.mockResolvedValue({
        comments: mockComments,
        total: 2,
      });

      const result = await service.getCommentsByContent(movieId, undefined, options, userId);

      expect(result.comments).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(commentRepository.findByContent).toHaveBeenCalledWith(
        movieId,
        undefined,
        expect.objectContaining({ userId })
      );
    });

    it('should get comments for TV show', async () => {
      const tvId = 456;
      const options = { page: 1, limit: 10 };

      const mockComments = [
        {
          id: 3,
          content: 'Love this show!',
          userId: 1,
          tvId,
          user: { id: 1, name: 'User 1' },
        },
      ];

      commentRepository.findByContent.mockResolvedValue({
        comments: mockComments,
        total: 1,
      });

      const result = await service.getCommentsByContent(undefined, tvId, options);

      expect(result.comments).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should return empty array if no comments', async () => {
      const movieId = 123;

      commentRepository.findByContent.mockResolvedValue({
        comments: [],
        total: 0,
      });

      const result = await service.getCommentsByContent(movieId);

      expect(result.comments).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
