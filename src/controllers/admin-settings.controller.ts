import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Put,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";
import { Roles } from "../decorators/roles.decorator";
import { UserRole } from "../entities/user.entity";
import { ApiResponse } from "../interfaces/api.interface";
import { AdminSettingsService } from "../services/admin-settings.service";
import { RegistrationSettingsDto } from "../dto/admin-settings.dto";
import { ViewerReadOnlyInterceptor } from "../interceptors/viewer-read-only.interceptor";

@Controller("admin/settings")
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ViewerReadOnlyInterceptor)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.VIEWER)
export class AdminSettingsController {
  constructor(private readonly adminSettingsService: AdminSettingsService) {}

  @Get("registration")
  @HttpCode(HttpStatus.OK)
  async getRegistrationSettings(): Promise<ApiResponse> {
    const data = await this.adminSettingsService.getRegistrationSettings();
    return {
      success: true,
      message: "Registration settings retrieved",
      data,
    };
  }

  @Put("registration")
  @HttpCode(HttpStatus.OK)
  async updateRegistrationSettings(
    @Body() body: RegistrationSettingsDto
  ): Promise<ApiResponse> {
    const data = await this.adminSettingsService.updateRegistrationSettings(body);
    return {
      success: true,
      message: "Registration settings updated",
      data,
    };
  }
}
