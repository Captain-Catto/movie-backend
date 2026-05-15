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
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../decorators/roles.decorator";
import { ResolveChatFlagDto } from "../dto/chat.dto";
import { ChatModerationStatus, UserRole } from "../entities";
import { RolesGuard } from "../guards/roles.guard";
import { ChatService } from "../services/chat.service";

@ApiTags("Admin - Chat")
@ApiBearerAuth("JWT")
@Controller("admin/chat")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.VIEWER)
export class AdminChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get("flags")
  async getFlags(@Query("status") status?: ChatModerationStatus) {
    const flags = await this.chatService.getFlags(status);
    return {
      success: true,
      data: flags,
    };
  }

  @Get("sessions/:id")
  async getSession(@Param("id", ParseIntPipe) sessionId: number) {
    const data = await this.chatService.getAdminSession(sessionId);
    return {
      success: true,
      data,
    };
  }

  @Post("flags/:id/resolve")
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
