import { Controller, Get, HttpCode, HttpStatus } from "@nestjs/common";
import { AdminSettingsService } from "../services/admin-settings.service";
import { ApiResponse } from "../interfaces/api.interface";

@Controller("settings")
export class SettingsController {
  constructor(private readonly adminSettingsService: AdminSettingsService) {}

  @Get("registration")
  @HttpCode(HttpStatus.OK)
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
  async getEffects(): Promise<ApiResponse> {
    const data = await this.adminSettingsService.getEffectSettings();
    return {
      success: true,
      message: "Effect settings",
      data,
    };
  }
}
