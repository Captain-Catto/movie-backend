import { Controller, Get, Post, Body, Query } from "@nestjs/common";

@Controller("comments")
export class CommentController {
  @Get()
  async getComments(@Query() query: any) {
    console.log(
      "📝 [CommentController] GET /api/comments called with query:",
      query
    );
    return {
      success: true,
      data: {
        comments: [],
        total: 0,
        page: query.page || 1,
        limit: query.limit || 20,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    };
  }

  @Post()
  async createComment(@Body() body: any) {
    console.log(
      "✍️ [CommentController] POST /api/comments called with body:",
      body
    );

    // Mock response for a created comment
    const mockComment = {
      id: Date.now(),
      content: body.content,
      userId: body.userId || 1,
      movieId: body.movieId,
      tvSeriesId: body.tvSeriesId,
      parentId: body.parentId || null,
      likesCount: 0,
      dislikesCount: 0,
      repliesCount: 0,
      isEdited: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      user: {
        id: 1,
        username: "testuser",
        email: "test@example.com",
      },
      userLikeStatus: null,
      replies: [],
    };

    return {
      success: true,
      data: mockComment,
    };
  }

  @Get("test")
  async test() {
    console.log("🧪 [CommentController] Test endpoint called");
    return { message: "Comment controller is working!" };
  }

  @Post("check-content")
  async checkContent(@Body() body: { content: string }) {
    console.log("🔍 [CommentController] Content check called:", body);
    return {
      success: true,
      data: { isAllowed: true },
    };
  }
}
