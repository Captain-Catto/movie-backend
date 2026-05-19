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
    try {
      const data = await this.adminSettingsService.getRegistrationSettings();
      return {
        success: true,
        message: "Registration settings",
        data,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to load registration settings",
        error: error.message,
        data: { nickname: { min: 3, max: 16 }, password: { min: 6, max: 16 } },
      };
    }
  }

  @Get("effects")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({
    summary: "Get public visual effect settings",
    dataType: "Effect settings",
  })
  @ApiStandardErrors()
  async getEffects(): Promise<ApiResponse> {
    try {
      const data = await this.adminSettingsService.getEffectSettings();
      return {
        success: true,
        message: "Effect settings",
        data,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to load effect settings",
        error: error.message,
        data: {
          enabled: false,
          activeEffects: [],
          intensity: "medium",
          redEnvelopeSettings: {
            fallSpeed: 0.3,
            rotationSpeed: 1,
            windStrength: 0.3,
            sparkleFrequency: 0.02,
            quantity: 25,
          },
          snowSettings: {
            speed: 1,
            density: 1,
            size: 1,
            windStrength: 0.2,
          },
          excludedPaths: [],
        },
      };
    }
  }
}
