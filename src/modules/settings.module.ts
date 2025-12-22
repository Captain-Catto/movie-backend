import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Setting } from "../entities";
import { AdminSettingsService } from "../services/admin-settings.service";
import { SettingsController } from "../controllers/settings.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Setting])],
  controllers: [SettingsController],
  providers: [AdminSettingsService],
  exports: [AdminSettingsService],
})
export class SettingsModule {}
