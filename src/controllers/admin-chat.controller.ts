import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../decorators/roles.decorator";
import { ResolveChatFlagDto } from "../dto/chat.dto";
import { ChatModerationStatus, UserRole } from "../entities";
import { RolesGuard } from "../guards/roles.guard";
import { ChatService } from "../services/chat.service";
import { ApiStandardErrors, ApiSuccess } from "../swagger/api-response.decorators";

@ApiTags("Admin - Chat")
@ApiBearerAuth("JWT")
@Controller("admin/chat")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.VIEWER)
export class AdminChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get("flags")
  @ApiSuccess({ summary: "List chatbot moderation flags", dataType: "Moderation flags", isArray: true })
  @ApiStandardErrors({ unauthorized: true, forbidden: true })
  @ApiQuery({ name: "status", required: false, enum: ChatModerationStatus })
  async getFlags(@Query("status") status?: ChatModerationStatus) {
    const flags = await this.chatService.getFlags(status);
    return {
      success: true,
      data: flags,
    };
  }

  @Get("sessions/:id")
  @ApiSuccess({ summary: "Get a chat session with messages for moderation review", dataType: "Chat session detail" })
  @ApiStandardErrors({ unauthorized: true, forbidden: true, notFound: true })
  @ApiParam({ name: "id", type: Number, example: 1, description: "Chat session ID" })
  async getSession(@Param("id", ParseIntPipe) sessionId: number) {
    const data = await this.chatService.getAdminSession(sessionId);
    return {
      success: true,
      data,
    };
  }

  @Post("flags/:id/resolve")
  @ApiSuccess({ summary: "Resolve or ignore a chatbot moderation flag", dataType: "Updated moderation flag" })
  @ApiStandardErrors({ unauthorized: true, forbidden: true, notFound: true })
  @ApiParam({ name: "id", type: Number, example: 1, description: "Moderation flag ID" })
  async resolveFlag(
    @Param("id", ParseIntPipe) flagId: number,
    @Body() dto: ResolveChatFlagDto,
    @Request() req
  ) {
    const flag = await this.chatService.resolveFlag(
      flagId,
      req.user.id,
      dto.status,
      dto.note
    );
    return {
      success: true,
      data: flag,
    };
  }
}
