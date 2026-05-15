import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AdminChatController } from "../controllers/admin-chat.controller";
import { ChatController } from "../controllers/chat.controller";
import {
  ChatMessage,
  ChatModerationFlag,
  ChatSession,
  ContentTranslation,
  Favorite,
  Movie,
  RecentSearch,
  Trending,
  TVSeries,
  User,
  ViewAnalytics,
} from "../entities";
import { RolesGuard } from "../guards/roles.guard";
import { AuthModule } from "./auth.module";
import { ChatService } from "../services/chat.service";

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    TypeOrmModule.forFeature([
      ChatSession,
      ChatMessage,
      ChatModerationFlag,
      ContentTranslation,
      User,
      Favorite,
      ViewAnalytics,
      RecentSearch,
      Movie,
      TVSeries,
      Trending,
    ]),
  ],
  controllers: [ChatController, AdminChatController],
  providers: [ChatService, JwtAuthGuard, RolesGuard],
  exports: [ChatService],
})
export class ChatModule {}
