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
  UseInterceptors,
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
import { ViewerReadOnlyInterceptor } from "../interceptors/viewer-read-only.interceptor";
import { ApiBody, ApiParam, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  ApiIdParam,
  ApiPaginationQueries,
  ApiStandardErrors,
  ApiSuccess,
} from "../swagger/api-response.decorators";

@ApiTags('Admin - SEO')
@ApiBearerAuth('JWT')
@Controller("admin/seo")
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ViewerReadOnlyInterceptor)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.VIEWER)
export class AdminSeoController {
  constructor(private adminSeoService: AdminSeoService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiSuccess({ summary: "Create SEO metadata", dataType: "SEO metadata", status: HttpStatus.CREATED })
  @ApiBody({
    schema: {
      example: {
        pageType: "movie",
        pageSlug: "/movie/1226863",
        locale: "vi",
        title: "MovieStream - Movie Detail",
        description: "SEO description for this page",
        keywords: ["movie", "streaming"],
        ogImage: "https://movie.lequangtridat.com/api/og?title=MovieStream",
        isActive: true,
      },
    },
  })
  @ApiStandardErrors({ unauthorized: true, forbidden: true })
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
  @ApiSuccess({ summary: "Update SEO metadata", dataType: "SEO metadata" })
  @ApiIdParam("id", "SEO metadata ID")
  @ApiBody({
    schema: {
      example: {
        title: "Updated SEO title",
        description: "Updated SEO description",
        isActive: true,
      },
    },
  })
  @ApiStandardErrors({ unauthorized: true, forbidden: true, notFound: true })
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
  @ApiSuccess({ summary: "Delete SEO metadata", dataType: "null" })
  @ApiIdParam("id", "SEO metadata ID")
  @ApiStandardErrors({ unauthorized: true, forbidden: true, notFound: true })
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
  @ApiSuccess({ summary: "Get SEO metadata by ID", dataType: "SEO metadata" })
  @ApiIdParam("id", "SEO metadata ID")
  @ApiStandardErrors({ unauthorized: true, forbidden: true, notFound: true })
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
  @ApiSuccess({ summary: "List SEO metadata", dataType: "Paginated SEO metadata list" })
  @ApiPaginationQueries()
  @ApiStandardErrors({ unauthorized: true, forbidden: true })
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
  @ApiSuccess({ summary: "Get SEO metadata by page type", dataType: "SEO metadata list" })
  @ApiParam({ name: "pageType", enum: PageType, example: PageType.HOME })
  @ApiStandardErrors({ unauthorized: true, forbidden: true })
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
  @ApiSuccess({ summary: "Toggle SEO metadata active status", dataType: "SEO metadata" })
  @ApiIdParam("id", "SEO metadata ID")
  @ApiStandardErrors({ unauthorized: true, forbidden: true, notFound: true })
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
  @ApiSuccess({ summary: "Create default SEO metadata records", dataType: "Created SEO defaults", status: HttpStatus.CREATED })
  @ApiStandardErrors({ unauthorized: true, forbidden: true })
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
  @ApiSuccess({ summary: "Get SEO metadata statistics", dataType: "SEO statistics" })
  @ApiStandardErrors({ unauthorized: true, forbidden: true })
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
