import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommentController } from './comment.controller';
import { UnauthorizedException } from '@nestjs/common';

describe('CommentController', () => {
  let controller: CommentController;
  let commentService: any;

  beforeEach(() => {
    // Mock CommentService with actual method names
    commentService = {
      getCommentsByContent: vi.fn(),
      getCommentReplies: vi.fn(),
      getComment: vi.fn(),
      createComment: vi.fn(),
      updateComment: vi.fn(),
      deleteComment: vi.fn(),
      likeComment: vi.fn(),
      reportComment: vi.fn(),
      getUserComments: vi.fn(),
      getCommentStats: vi.fn(),
      searchUsersForMention: vi.fn(),
      fixReplyCounts: vi.fn(),
      fixLikeCounts: vi.fn(),
    };

    controller = new CommentController(commentService);
  });

  describe('getMovieComments', () => {
    it('should get movie comments with default pagination', async () => {
      const movieId = 12345;
      const mockData = {
        comments: [
          {
            id: 1,
            content: 'Great movie!',
            userId: 1,
            movieId: 12345,
            createdAt: new Date(),
          },
          {
            id: 2,
            content: 'Amazing!',
            userId: 2,
            movieId: 12345,
            createdAt: new Date(),
          },
        ],
        total: 2,
        page: 1,
        totalPages: 1,
        hasMore: false,
      };

      commentService.getCommentsByContent.mockResolvedValue(mockData);

      const result = await controller.getMovieComments(movieId, '1', '20', 'newest');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Movie comments retrieved successfully');
      expect(result.data).toEqual(mockData);
      expect(commentService.getCommentsByContent).toHaveBeenCalledWith(
        movieId,
        undefined,
        { page: 1, limit: 20, sortBy: 'newest' },
        1
      );
    });

    it('should get movie comments with custom pagination and sort', async () => {
      const movieId = 12345;
      const mockData = {
        comments: [],
        total: 50,
        page: 3,
        totalPages: 5,
        hasMore: true,
      };

      commentService.getCommentsByContent.mockResolvedValue(mockData);

      const result = await controller.getMovieComments(movieId, '3', '10', 'oldest', '5');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(commentService.getCommentsByContent).toHaveBeenCalledWith(
        movieId,
        undefined,
        { page: 3, limit: 10, sortBy: 'oldest' },
        5
      );
    });

    it('should sort by popular', async () => {
      const movieId = 12345;
      const mockData = {
        comments: [{ id: 1, content: 'Popular comment', likesCount: 100 }],
        total: 1,
        page: 1,
        totalPages: 1,
        hasMore: false,
      };

      commentService.getCommentsByContent.mockResolvedValue(mockData);

      const result = await controller.getMovieComments(movieId, '1', '20', 'popular');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
    });

    it('should handle errors gracefully', async () => {
      const movieId = 12345;

      commentService.getCommentsByContent.mockRejectedValue(
        new Error('Database error')
      );

      const result = await controller.getMovieComments(movieId, '1', '20', 'newest');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to retrieve movie comments');
      expect(result.error).toBe('Database error');
    });
  });

  describe('getTvComments', () => {
    it('should get TV show comments with default pagination', async () => {
      const tvId = 67890;
      const mockData = {
        comments: [
          {
            id: 1,
            content: 'Great show!',
            userId: 1,
            tvId: 67890,
            createdAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        totalPages: 1,
        hasMore: false,
      };

      commentService.getCommentsByContent.mockResolvedValue(mockData);

      const result = await controller.getTvComments(tvId, '1', '20', 'newest');

      expect(result.success).toBe(true);
      expect(result.message).toBe('TV show comments retrieved successfully');
      expect(result.data).toEqual(mockData);
      expect(commentService.getCommentsByContent).toHaveBeenCalledWith(
        undefined,
        tvId,
        { page: 1, limit: 20, sortBy: 'newest' },
        1
      );
    });

    it('should get TV comments with custom pagination', async () => {
      const tvId = 67890;
      const mockData = {
        comments: [],
        total: 30,
        page: 2,
        totalPages: 3,
        hasMore: true,
      };

      commentService.getCommentsByContent.mockResolvedValue(mockData);

      const result = await controller.getTvComments(tvId, '2', '10', 'oldest', '3');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
    });

    it('should handle errors gracefully', async () => {
      const tvId = 67890;

      commentService.getCommentsByContent.mockRejectedValue(
        new Error('Service error')
      );

      const result = await controller.getTvComments(tvId, '1', '20', 'newest');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to retrieve TV show comments');
    });
  });

  describe('getCommentReplies', () => {
    it('should get comment replies with default pagination', async () => {
      const commentId = 1;
      const mockData = {
        replies: [
          {
            id: 2,
            content: 'Reply to comment',
            userId: 2,
            parentId: 1,
            createdAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        totalPages: 1,
        hasMore: false,
      };

      commentService.getCommentReplies.mockResolvedValue(mockData);

      const result = await controller.getCommentReplies(commentId, '1', '10');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Comment replies retrieved successfully');
      expect(result.data).toEqual(mockData);
      expect(commentService.getCommentReplies).toHaveBeenCalledWith(
        commentId,
        { page: 1, limit: 10 },
        1
      );
    });

    it('should handle errors when fetching replies', async () => {
      const commentId = 1;

      commentService.getCommentReplies.mockRejectedValue(
        new Error('Comment not found')
      );

      const result = await controller.getCommentReplies(commentId, '1', '10');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to retrieve comment replies');
    });
  });

  describe('getComment', () => {
    it('should get comment by id', async () => {
      const commentId = 1;
      const mockComment = {
        id: 1,
        content: 'Test comment',
        userId: 1,
        movieId: 12345,
        user: {
          id: 1,
          username: 'testuser',
        },
        likesCount: 5,
        repliesCount: 3,
      };

      commentService.getComment.mockResolvedValue(mockComment);

      const result = await controller.getComment(commentId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Comment retrieved successfully');
      expect(result.data).toEqual(mockComment);
      expect(commentService.getComment).toHaveBeenCalledWith(commentId, undefined);
    });

    it('should get comment with authenticated user', async () => {
      const commentId = 1;
      const mockComment = { id: 1, content: 'Test' };
      const mockReq = { user: { id: 5 } };

      commentService.getComment.mockResolvedValue(mockComment);

      const result = await controller.getComment(commentId, mockReq);

      expect(result.success).toBe(true);
      expect(commentService.getComment).toHaveBeenCalledWith(commentId, 5);
    });

    it('should handle errors when comment not found', async () => {
      const commentId = 999;

      commentService.getComment.mockRejectedValue(new Error('Comment not found'));

      const result = await controller.getComment(commentId);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Comment not found');
    });
  });

  describe('createComment', () => {
    it('should create movie comment when authenticated', async () => {
      const dto = {
        content: 'Great movie!',
        movieId: 12345,
      };
      const mockReq = { user: { id: 1 } };
      const mockComment = {
        id: 1,
        content: 'Great movie!',
        userId: 1,
        movieId: 12345,
        createdAt: new Date(),
      };

      commentService.createComment.mockResolvedValue(mockComment);

      const result = await controller.createComment(dto, mockReq);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Comment created successfully');
      expect(result.data).toEqual(mockComment);
      expect(commentService.createComment).toHaveBeenCalledWith(dto, 1);
    });

    it('should create TV show comment', async () => {
      const dto = {
        content: 'Awesome show!',
        tvId: 67890,
      };
      const mockReq = { user: { id: 1 } };
      const mockComment = {
        id: 2,
        content: 'Awesome show!',
        userId: 1,
        tvId: 67890,
        createdAt: new Date(),
      };

      commentService.createComment.mockResolvedValue(mockComment);

      const result = await controller.createComment(dto, mockReq);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockComment);
    });

    it('should throw UnauthorizedException if no user in request', async () => {
      const dto = { content: 'Test', movieId: 12345 };
      const mockReq = {}; // No user

      const result = await controller.createComment(dto, mockReq);

      expect(result.success).toBe(false);
      expect(result.message).toBe('User not authenticated');
    });

    it('should handle service errors', async () => {
      const dto = { content: 'Hi', movieId: 12345 };
      const mockReq = { user: { id: 1 } };

      commentService.createComment.mockRejectedValue(
        new Error('Content too short')
      );

      const result = await controller.createComment(dto, mockReq);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Content too short');
    });
  });

  describe('updateComment', () => {
    it('should update comment successfully', async () => {
      const commentId = 1;
      const dto = { content: 'Updated comment text' };
      const mockReq = { user: { id: 1, role: 'user' } };
      const mockUpdatedComment = {
        id: 1,
        content: 'Updated comment text',
        userId: 1,
        updatedAt: new Date(),
      };

      commentService.updateComment.mockResolvedValue(mockUpdatedComment);

      const result = await controller.updateComment(commentId, dto, mockReq);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Comment updated successfully');
      expect(result.data).toEqual(mockUpdatedComment);
      expect(commentService.updateComment).toHaveBeenCalledWith(
        commentId,
        dto,
        1,
        'user'
      );
    });

    it('should use default userId and role when no auth', async () => {
      const commentId = 1;
      const dto = { content: 'Updated' };
      const mockReq = {}; // No user

      commentService.updateComment.mockResolvedValue({ id: 1 });

      await controller.updateComment(commentId, dto, mockReq);

      expect(commentService.updateComment).toHaveBeenCalledWith(
        commentId,
        dto,
        1,
        'user'
      );
    });

    it('should handle update errors', async () => {
      const commentId = 1;
      const dto = { content: 'Updated' };
      const mockReq = { user: { id: 2, role: 'user' } };

      commentService.updateComment.mockRejectedValue(
        new Error('You can only update your own comments')
      );

      const result = await controller.updateComment(commentId, dto, mockReq);

      expect(result.success).toBe(false);
      expect(result.message).toBe('You can only update your own comments');
    });
  });

  describe('deleteComment', () => {
    it('should delete comment successfully', async () => {
      const commentId = 1;
      const mockReq = { user: { id: 1, role: 'user' } };

      commentService.deleteComment.mockResolvedValue({
        message: 'Comment deleted successfully',
      });

      const result = await controller.deleteComment(commentId, mockReq);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Comment deleted successfully');
      expect(commentService.deleteComment).toHaveBeenCalledWith(commentId, 1, 'user');
    });

    it('should use default userId and role when no auth', async () => {
      const commentId = 1;
      const mockReq = {}; // No user

      commentService.deleteComment.mockResolvedValue({
        message: 'Comment deleted',
      });

      await controller.deleteComment(commentId, mockReq);

      expect(commentService.deleteComment).toHaveBeenCalledWith(
        commentId,
        1,
        'user'
      );
    });

    it('should handle delete errors', async () => {
      const commentId = 1;
      const mockReq = { user: { id: 2, role: 'user' } };

      commentService.deleteComment.mockRejectedValue(
        new Error('You can only delete your own comments')
      );

      const result = await controller.deleteComment(commentId, mockReq);

      expect(result.success).toBe(false);
      expect(result.message).toBe('You can only delete your own comments');
    });
  });

  describe('likeComment', () => {
    it('should like comment successfully', async () => {
      const commentId = 1;
      const mockReq = { user: { id: 1 } };
      const mockResult = { likesCount: 6, dislikesCount: 0 };

      commentService.likeComment.mockResolvedValue(mockResult);

      const result = await controller.likeComment(commentId, true, mockReq);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Comment liked successfully');
      expect(result.data).toEqual(mockResult);
      expect(commentService.likeComment).toHaveBeenCalledWith(commentId, 1, true);
    });

    it('should dislike comment successfully', async () => {
      const commentId = 1;
      const mockReq = { user: { id: 1 } };
      const mockResult = { likesCount: 5, dislikesCount: 1 };

      commentService.likeComment.mockResolvedValue(mockResult);

      const result = await controller.likeComment(commentId, false, mockReq);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Comment disliked successfully');
      expect(commentService.likeComment).toHaveBeenCalledWith(commentId, 1, false);
    });
  });

  describe('reportComment', () => {
    it('should report comment successfully', async () => {
      const commentId = 1;
      const dto = { reason: 'spam' as const, details: 'This is spam' };
      const mockReq = { user: { id: 1 } };

      commentService.reportComment.mockResolvedValue({
        message: 'Comment reported successfully',
      });

      const result = await controller.reportComment(commentId, dto, mockReq);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Comment reported successfully');
      expect(commentService.reportComment).toHaveBeenCalledWith(commentId, dto, 1);
    });
  });

  describe('getUserComments', () => {
    it('should get user comments with authentication', async () => {
      const mockReq = { user: { id: 1 } };
      const mockData = {
        comments: [{ id: 1, content: 'My comment', userId: 1 }],
        total: 1,
      };

      commentService.getUserComments.mockResolvedValue(mockData);

      const result = await controller.getUserComments(mockReq, '1', '20');

      expect(result.success).toBe(true);
      expect(result.message).toBe('User comments retrieved successfully');
      expect(result.data).toEqual(mockData);
      expect(commentService.getUserComments).toHaveBeenCalledWith(1, {
        page: 1,
        limit: 20,
      });
    });
  });

  describe('getMovieCommentStats', () => {
    it('should get movie comment statistics', async () => {
      const movieId = 12345;
      const mockStats = {
        totalComments: 100,
        totalReplies: 50,
        avgRating: 4.5,
      };

      commentService.getCommentStats.mockResolvedValue(mockStats);

      const result = await controller.getMovieCommentStats(movieId);

      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'Movie comment statistics retrieved successfully'
      );
      expect(result.data).toEqual(mockStats);
      expect(commentService.getCommentStats).toHaveBeenCalledWith(movieId, true);
    });
  });

  describe('getTvCommentStats', () => {
    it('should get TV comment statistics', async () => {
      const tvId = 67890;
      const mockStats = { totalComments: 75 };

      commentService.getCommentStats.mockResolvedValue(mockStats);

      const result = await controller.getTvCommentStats(tvId);

      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'TV show comment statistics retrieved successfully'
      );
      expect(result.data).toEqual(mockStats);
      expect(commentService.getCommentStats).toHaveBeenCalledWith(tvId, false);
    });
  });

  describe('checkContent', () => {
    it('should check content and return allowed', async () => {
      const body = { content: 'This is fine' };

      const result = await controller.checkContent(body);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Content check completed');
      expect(result.data).toEqual({ isAllowed: true });
    });
  });

  describe('searchUsers', () => {
    it('should search users for mentions', async () => {
      const mockUsers = [
        { id: 1, username: 'john' },
        { id: 2, username: 'jane' },
      ];

      commentService.searchUsersForMention.mockResolvedValue(mockUsers);

      const result = await controller.searchUsers('jo', '10');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Users found');
      expect(result.data).toEqual(mockUsers);
      expect(commentService.searchUsersForMention).toHaveBeenCalledWith('jo', 10);
    });

    it('should return empty array for short query', async () => {
      const result = await controller.searchUsers('a', '10');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Query too short');
      expect(result.data).toEqual([]);
    });
  });

  describe('fixReplyCounts', () => {
    it('should fix reply counts successfully', async () => {
      const mockResult = { fixed: 10 };

      commentService.fixReplyCounts.mockResolvedValue(mockResult);

      const result = await controller.fixReplyCounts();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Reply counts fixed successfully');
      expect(result.data).toEqual(mockResult);
    });
  });

  describe('fixLikeCounts', () => {
    it('should fix like counts successfully', async () => {
      const mockResult = { fixed: 20 };

      commentService.fixLikeCounts.mockResolvedValue(mockResult);

      const result = await controller.fixLikeCounts();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Like/dislike counts fixed successfully');
      expect(result.data).toEqual(mockResult);
    });
  });
});
