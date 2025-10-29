import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

// Entities
import {
  Comment,
  CommentLike,
  CommentMention,
  BannedWord,
  CommentReport,
} from "../entities/comment.entity";
import { User } from "../entities/user.entity";

// Services
import { CommentService } from "../services/comment.service";
import { ContentFilterService } from "../services/content-filter.service";

// Repositories
import {
  CommentRepository,
  CommentLikeRepository,
  CommentReportRepository,
  BannedWordRepository,
  CommentMentionRepository,
} from "../repositories/comment.repository";

// Controllers
import { CommentController } from "../controllers/comment.controller";
import { NotificationModule } from "./notification.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Comment,
      CommentLike,
      CommentMention,
      BannedWord,
      CommentReport,
      User,
    ]),
    NotificationModule,
  ],
  controllers: [CommentController],
  providers: [
    CommentService,
    ContentFilterService,
    CommentRepository,
    CommentLikeRepository,
    CommentReportRepository,
    BannedWordRepository,
    CommentMentionRepository,
  ],
  exports: [CommentService, ContentFilterService],
})
export class CommentModule {}
