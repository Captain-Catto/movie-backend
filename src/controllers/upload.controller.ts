import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  Request,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import * as multer from "multer";
import { S3Service } from "../services/s3.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

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

  @UseGuards(JwtAuthGuard)
  @Post("avatar")
  @UseInterceptors(
    FileInterceptor("avatar", {
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
      fileFilter: (req, file, callback) => {
        if (file.mimetype.startsWith("image/")) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException("Only image files are allowed"),
            false
          );
        }
      },
    })
  )
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Request() req
  ) {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    const uploadResult = await this.s3Service.uploadAvatar(
      file.buffer,
      `${req.user?.id || "user"}-${file.originalname}`,
      file.mimetype
    );

    if (!uploadResult.success || !uploadResult.url) {
      throw new BadRequestException(uploadResult.message || "Upload failed");
    }

    return {
      success: true,
      message: "Avatar uploaded successfully",
      url: uploadResult.url,
      key: uploadResult.key,
    };
  }
}
