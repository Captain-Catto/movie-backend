import { Controller, Get, HttpCode, HttpStatus } from "@nestjs/common";
import { AdminSettingsService } from "../services/admin-settings.service";
import { ApiResponse } from "../interfaces/api.interface";
import { ApiTags } from '@nestjs/swagger';
import { ApiStandardErrors, ApiSuccess } from "../swagger/api-response.decorators";

@ApiTags('Settings')
@Controller("settings")
export class SettingsController {
  constructor(private readonly adminSettingsService: AdminSettingsService) {}

  @Get("registration")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({
    summary: "Get public registration settings",
    dataType: "Registration settings",
  })
  @ApiStandardErrors()
  async getRegistration(): Promise<ApiResponse> {
    const data = await this.adminSettingsService.getRegistrationSettings();
    return {
      success: true,
      message: "Registration settings",
      data,
    };
  }

  @Get("effects")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({
    summary: "Get public visual effect settings",
    dataType: "Effect settings",
  })
  @ApiStandardErrors()
  async getEffects(): Promise<ApiResponse> {
    const data = await this.adminSettingsService.getEffectSettings();
    return {
      success: true,
      message: "Effect settings",
      data,
    };
  }
}
