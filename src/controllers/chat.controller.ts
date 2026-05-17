import {
  Body,
  Controller,
  Delete,
  Get,
  Query,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { GetUser } from "../decorators/get-user.decorator";
import { SendChatMessageDto } from "../dto/chat.dto";
import { ChatService } from "../services/chat.service";
import { ApiStandardErrors, ApiSuccess } from "../swagger/api-response.decorators";

@ApiTags("Chat")
@ApiBearerAuth("JWT")
@Controller("chat")
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post("sessions")
  @ApiSuccess({ summary: "Create or get current chat session", dataType: "Chat session" })
  @ApiStandardErrors({ unauthorized: true })
  @ApiQuery({ name: "new", required: false, enum: ["true", "false"], description: "Use true to force-create a new session" })
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
  @ApiSuccess({ summary: "List authenticated user's chat sessions", dataType: "Chat sessions", isArray: true })
  @ApiStandardErrors({ unauthorized: true })
  async getSessions(@GetUser("id") userId: number): Promise<any> {
    const sessions = await this.chatService.getUserSessions(userId);
    return {
      success: true,
      data: sessions,
    };
  }

  @Get("sessions/:id/messages")
  @ApiSuccess({ summary: "List messages in a chat session", dataType: "Chat messages", isArray: true })
  @ApiStandardErrors({ unauthorized: true, notFound: true })
  @ApiParam({ name: "id", type: Number, example: 1, description: "Chat session ID" })
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

  @Delete("sessions/:id")
  @ApiSuccess({ summary: "Archive a chat session", dataType: "No content" })
  @ApiStandardErrors({ unauthorized: true, notFound: true })
  @ApiParam({ name: "id", type: Number, example: 1, description: "Chat session ID" })
  async deleteSession(
    @GetUser("id") userId: number,
    @Param("id", ParseIntPipe) sessionId: number
  ): Promise<any> {
    await this.chatService.archiveSession(userId, sessionId);
    return {
      success: true,
      data: null,
    };
  }

  @Post("sessions/:id/messages")
  @ApiSuccess({ summary: "Send a message to the AI movie assistant", dataType: "Assistant reply with recommendation cards" })
  @ApiStandardErrors({ unauthorized: true, notFound: true })
  @ApiParam({ name: "id", type: Number, example: 1, description: "Chat session ID" })
  @ApiBody({ type: SendChatMessageDto })
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
