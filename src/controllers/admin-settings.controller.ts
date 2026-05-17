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
import {
  RegistrationSettingsDto,
  EffectSettingsDto,
  StreamDomainSettingsDto,
  SwaggerAuthSettingsDto,
} from "../dto/admin-settings.dto";
import { ViewerReadOnlyInterceptor } from "../interceptors/viewer-read-only.interceptor";
import { ApiBody, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ApiStandardErrors, ApiSuccess } from "../swagger/api-response.decorators";

@ApiTags('Admin - Settings')
@ApiBearerAuth('JWT')
@Controller("admin/settings")
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ViewerReadOnlyInterceptor)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.VIEWER)
export class AdminSettingsController {
  constructor(private readonly adminSettingsService: AdminSettingsService) {}

  @Get("registration")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Get admin registration settings", dataType: "Registration settings" })
  @ApiStandardErrors({ unauthorized: true, forbidden: true })
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
  @ApiSuccess({ summary: "Update registration settings", dataType: "Registration settings" })
  @ApiBody({ type: RegistrationSettingsDto })
  @ApiStandardErrors({ unauthorized: true, forbidden: true })
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

  @Get("effects")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Get admin effect settings", dataType: "Effect settings" })
  @ApiStandardErrors({ unauthorized: true, forbidden: true })
  async getEffectSettings(): Promise<ApiResponse> {
    const data = await this.adminSettingsService.getEffectSettings();
    return {
      success: true,
      message: "Effect settings retrieved",
      data,
    };
  }

  @Put("effects")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Update effect settings", dataType: "Effect settings" })
  @ApiBody({ type: EffectSettingsDto })
  @ApiStandardErrors({ unauthorized: true, forbidden: true })
  async updateEffectSettings(
    @Body() body: EffectSettingsDto
  ): Promise<ApiResponse> {
    const data = await this.adminSettingsService.updateEffectSettings(body);
    return {
      success: true,
      message: "Effect settings updated",
      data,
    };
  }

  @Get("stream-domains")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Get stream domain settings", dataType: "Stream domain settings" })
  @ApiStandardErrors({ unauthorized: true, forbidden: true })
  async getStreamDomainSettings(): Promise<ApiResponse> {
    const data = await this.adminSettingsService.getStreamDomainSettings();
    return {
      success: true,
      message: "Stream domain settings retrieved",
      data,
    };
  }

  @Put("stream-domains")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Update stream domain settings", dataType: "Stream domain settings" })
  @ApiBody({ type: StreamDomainSettingsDto })
  @ApiStandardErrors({ unauthorized: true, forbidden: true })
  async updateStreamDomainSettings(
    @Body() body: StreamDomainSettingsDto
  ): Promise<ApiResponse> {
    const data = await this.adminSettingsService.updateStreamDomainSettings(
      body
    );
    return {
      success: true,
      message: "Stream domain settings updated",
      data,
    };
  }

  @Get("swagger-auth")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Get Swagger documentation auth settings", dataType: "Swagger auth settings" })
  @ApiStandardErrors({ unauthorized: true, forbidden: true })
  async getSwaggerAuthSettings(): Promise<ApiResponse> {
    const data = await this.adminSettingsService.getSwaggerAuthSettings();
    return {
      success: true,
      message: "Swagger auth settings retrieved",
      data,
    };
  }

  @Put("swagger-auth")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({ summary: "Update Swagger documentation auth settings", dataType: "Swagger auth settings" })
  @ApiBody({ type: SwaggerAuthSettingsDto })
  @ApiStandardErrors({ unauthorized: true, forbidden: true })
  async updateSwaggerAuthSettings(
    @Body() body: SwaggerAuthSettingsDto
  ): Promise<ApiResponse> {
    const data = await this.adminSettingsService.updateSwaggerAuthSettings(
      body
    );
    return {
      success: true,
      message: "Swagger auth settings updated",
      data,
    };
  }
}
