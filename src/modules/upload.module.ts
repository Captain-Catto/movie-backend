import { Module } from "@nestjs/common";
import { UploadController } from "../controllers/upload.controller";
import { S3Service } from "../services/s3.service";

@Module({
  controllers: [UploadController],
  providers: [S3Service],
  exports: [S3Service],
})
export class UploadModule {}
