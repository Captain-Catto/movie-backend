import { Controller, Get, HttpCode, HttpStatus, Query } from "@nestjs/common";
import { ApiResponse } from "../interfaces/api.interface";
import { AdminSeoService } from "../services/admin-seo.service";

@Controller("seo")
export class SeoController {
  constructor(private readonly adminSeoService: AdminSeoService) {}

  @Get("resolve")
  @HttpCode(HttpStatus.OK)
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
