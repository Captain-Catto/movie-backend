import {
  Body,
  Controller,
  Get,
  Query,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { GetUser } from "../decorators/get-user.decorator";
import { SendChatMessageDto } from "../dto/chat.dto";
import { ChatService } from "../services/chat.service";

@ApiTags("Chat")
@ApiBearerAuth("JWT")
@Controller("chat")
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post("sessions")
  async createSession(
    @GetUser("id") userId: number,
    @Query("new") createNew?: string
  ): Promise<any> {
    const session =
      createNew === "true"
        ? await this.chatService.createSession(userId)
        : await this.chatService.createOrGetSession(userId);
    return {
      success: true,
      data: session,
    };
  }

  @Get("sessions")
  async getSessions(@GetUser("id") userId: number): Promise<any> {
    const sessions = await this.chatService.getUserSessions(userId);
    return {
      success: true,
      data: sessions,
    };
  }

  @Get("sessions/:id/messages")
  async getMessages(
    @GetUser("id") userId: number,
    @Param("id", ParseIntPipe) sessionId: number
  ): Promise<any> {
    const messages = await this.chatService.getSessionMessages(userId, sessionId);
    return {
      success: true,
      data: messages,
    };
  }

  @Post("sessions/:id/messages")
  async sendMessage(
    @GetUser("id") userId: number,
    @Param("id", ParseIntPipe) sessionId: number,
    @Body() dto: SendChatMessageDto
  ): Promise<any> {
    const result = await this.chatService.sendMessage(
      userId,
      sessionId,
      dto.message,
      dto.language
    );

    return {
      success: true,
      data: result,
    };
  }
}
