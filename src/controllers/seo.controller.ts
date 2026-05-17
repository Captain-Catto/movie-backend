import { Controller, Get, HttpCode, HttpStatus, Query } from "@nestjs/common";
import { ApiResponse } from "../interfaces/api.interface";
import { AdminSeoService } from "../services/admin-seo.service";
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiStandardErrors, ApiSuccess } from "../swagger/api-response.decorators";

@ApiTags('SEO')
@Controller("seo")
export class SeoController {
  constructor(private readonly adminSeoService: AdminSeoService) {}

  @Get("resolve")
  @HttpCode(HttpStatus.OK)
  @ApiSuccess({
    summary: "Resolve SEO metadata for a public route",
    dataType: "SEO metadata or null",
  })
  @ApiQuery({ name: "path", required: true, type: String, example: "/movie/1226863" })
  @ApiQuery({ name: "locale", required: false, type: String, example: "vi-VN" })
  @ApiStandardErrors()
  async resolveSeo(
    @Query("path") path?: string,
    @Query("locale") locale?: string
  ): Promise<ApiResponse> {
    try {
      if (!path || !path.trim()) {
        return {
          success: false,
          message: "Path is required",
          error: "Missing required query parameter: path",
        };
      }

      const seo = await this.adminSeoService.resolveSeoByPath(path, locale);

      return {
        success: true,
        message: seo
          ? "SEO metadata resolved successfully"
          : "No SEO metadata found",
        data: seo,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to resolve SEO metadata",
        error: error.message,
      };
    }
  }
}
