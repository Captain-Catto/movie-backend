import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SeoMetadata } from "../entities";
import { AdminSeoService } from "../services/admin-seo.service";
import { SeoController } from "../controllers/seo.controller";

@Module({
  imports: [TypeOrmModule.forFeature([SeoMetadata])],
  controllers: [SeoController],
  providers: [AdminSeoService],
})
export class SeoModule {}
