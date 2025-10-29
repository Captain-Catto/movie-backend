import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { S3Service } from "../services/s3.service";

@Controller("upload")
export class UploadController {
  constructor(private readonly s3Service: S3Service) {}

  @Post("video")
  @UseInterceptors(
    FileInterceptor("video", {
      limits: {
        fileSize: 500 * 1024 * 1024, // 500MB limit
      },
      fileFilter: (req, file, callback) => {
        if (file.mimetype.startsWith("video/")) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException("Only video files are allowed"),
            false
          );
        }
      },
    })
  )
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    try {
      const result = await this.s3Service.uploadMovie(
        file.buffer,
        file.originalname,
        file.mimetype
      );
      return {
        success: true,
        message: "Video uploaded successfully",
        url: result.url,
        key: result.key,
        filename: file.originalname,
      };
    } catch (error) {
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }
}
