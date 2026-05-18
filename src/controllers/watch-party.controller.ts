import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import {
  ApiIdParam,
  ApiStandardErrors,
  ApiSuccess,
} from "../swagger/api-response.decorators";
import { WatchPartyService } from "../services/watch-party.service";
import { CreateWatchPartyDto } from "../dto/watch-party.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../auth/optional-jwt-auth.guard";
import { ApiResponse } from "../interfaces/api.interface";

@ApiTags("Watch Party")
@Controller("watch-party")
export class WatchPartyController {
  constructor(private readonly watchPartyService: WatchPartyService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT")
  @HttpCode(HttpStatus.CREATED)
  @ApiSuccess({ summary: "Create a watch party room", dataType: "WatchPartyResponseDto" })
  @ApiStandardErrors({ unauthorized: true })
  async createParty(
    @Body() dto: CreateWatchPartyDto,
    @Request() req: any
  ): Promise<ApiResponse> {
    const party = await this.watchPartyService.createParty(dto, req.user.id);
    return {
      success: true,
      message: "Phòng xem đã được tạo",
      data: party,
    };
  }

  @Get(":inviteCode")
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiIdParam("inviteCode", "Invite code (8 hex chars)")
  @ApiSuccess({ summary: "Get watch party public info", dataType: "WatchPartyPublicInfoDto" })
  @ApiStandardErrors()
  async getParty(@Param("inviteCode") inviteCode: string): Promise<ApiResponse> {
    const party = await this.watchPartyService.getPartyByCode(inviteCode);
    return {
      success: true,
      message: "Thông tin phòng xem",
      data: party,
    };
  }

  @Delete(":partyId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT")
  @HttpCode(HttpStatus.OK)
  @ApiIdParam("partyId", "Watch Party ID")
  @ApiSuccess({ summary: "End a watch party room" })
  @ApiStandardErrors({ unauthorized: true, forbidden: true })
  async endParty(
    @Param("partyId") partyId: string,
    @Request() req: any
  ): Promise<ApiResponse> {
    await this.watchPartyService.endParty(parseInt(partyId, 10), req.user.id);
    return {
      success: true,
      message: "Phòng xem đã kết thúc",
    };
  }
}
