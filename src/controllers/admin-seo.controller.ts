import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from "@nestjs/common";
import {
  AdminSeoService,
  CreateSeoDto,
  UpdateSeoDto,
} from "../services/admin-seo.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";
import { Roles } from "../decorators/roles.decorator";
import { UserRole } from "../entities/user.entity";
import { ApiResponse } from "../interfaces/api.interface";
import { PageType } from "../entities";

@Controller("admin/seo")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminSeoController {
  constructor(private adminSeoService: AdminSeoService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSeoMetadata(@Body() dto: CreateSeoDto): Promise<ApiResponse> {
    try {
      const result = await this.adminSeoService.createSeoMetadata(dto);

      return {
        success: true,
        message: "SEO metadata created successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to create SEO metadata",
        error: error.message,
      };
    }
  }

  @Put(":id")
  @HttpCode(HttpStatus.OK)
  async updateSeoMetadata(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateSeoDto
  ): Promise<ApiResponse> {
    try {
      const result = await this.adminSeoService.updateSeoMetadata(id, dto);

      return {
        success: true,
        message: "SEO metadata updated successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to update SEO metadata",
        error: error.message,
      };
    }
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  async deleteSeoMetadata(
    @Param("id", ParseIntPipe) id: number
  ): Promise<ApiResponse> {
    try {
      await this.adminSeoService.deleteSeoMetadata(id);

      return {
        success: true,
        message: "SEO metadata deleted successfully",
        data: null,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to delete SEO metadata",
        error: error.message,
      };
    }
  }

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  async getSeoMetadata(
    @Param("id", ParseIntPipe) id: number
  ): Promise<ApiResponse> {
    try {
      const result = await this.adminSeoService.getSeoMetadata(id);

      return {
        success: true,
        message: "SEO metadata retrieved successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve SEO metadata",
        error: error.message,
      };
    }
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllSeoMetadata(
    @Query("page") page?: number,
    @Query("limit") limit?: number
  ): Promise<ApiResponse> {
    try {
      const result = await this.adminSeoService.getAllSeoMetadata(
        page ? Number(page) : 1,
        limit ? Number(limit) : 20
      );

      return {
        success: true,
        message: "SEO metadata list retrieved successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve SEO metadata list",
        error: error.message,
      };
    }
  }

  @Get("page-type/:pageType")
  @HttpCode(HttpStatus.OK)
  async getSeoByPageType(
    @Param("pageType") pageType: PageType
  ): Promise<ApiResponse> {
    try {
      const result = await this.adminSeoService.getSeoByPageType(pageType);

      return {
        success: true,
        message: "SEO metadata retrieved successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve SEO metadata",
        error: error.message,
      };
    }
  }

  @Post(":id/toggle")
  @HttpCode(HttpStatus.OK)
  async toggleSeoStatus(
    @Param("id", ParseIntPipe) id: number
  ): Promise<ApiResponse> {
    try {
      const result = await this.adminSeoService.toggleSeoStatus(id);

      return {
        success: true,
        message: `SEO metadata ${
          result.isActive ? "activated" : "deactivated"
        } successfully`,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to toggle SEO status",
        error: error.message,
      };
    }
  }

  @Post("setup/defaults")
  @HttpCode(HttpStatus.CREATED)
  async createDefaultSeoMetadata(): Promise<ApiResponse> {
    try {
      const result = await this.adminSeoService.createDefaultSeoMetadata();

      return {
        success: true,
        message: `Created ${result.length} default SEO metadata entries`,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to create default SEO metadata",
        error: error.message,
      };
    }
  }

  @Get("stats/overview")
  @HttpCode(HttpStatus.OK)
  async getSeoStats(): Promise<ApiResponse> {
    try {
      const stats = await this.adminSeoService.getSeoStats();

      return {
        success: true,
        message: "SEO stats retrieved successfully",
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve SEO stats",
        error: error.message,
      };
    }
  }
}
