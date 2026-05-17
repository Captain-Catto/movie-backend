import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  Request,
  Query,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import * as multer from "multer";
import { S3Service } from "../services/s3.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ApiBearerAuth, ApiConsumes, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  ApiMultipartFile,
  ApiStandardErrors,
  ApiSuccess,
} from "../swagger/api-response.decorators";

@ApiTags('Upload')
@Controller("upload")
export class UploadController {
  constructor(private readonly s3Service: S3Service) {}

  @UseGuards(JwtAuthGuard)
  @Post("video")
  @ApiBearerAuth("JWT")
  @ApiSuccess({ summary: "Upload a video file", dataType: "Uploaded video URL and S3 key" })
  @ApiStandardErrors({ unauthorized: true })
  @ApiConsumes("multipart/form-data")
  @ApiMultipartFile("video", "Video file. Maximum size: 500MB. Mimetype must start with video/.")
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
  @ApiBearerAuth("JWT")
  @ApiSuccess({ summary: "Upload authenticated user's avatar", dataType: "Uploaded avatar URL and S3 key" })
  @ApiStandardErrors({ unauthorized: true })
  @ApiConsumes("multipart/form-data")
  @ApiMultipartFile("avatar", "Avatar image file. Maximum size: 5MB. Mimetype must start with image/.")
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

  @UseGuards(JwtAuthGuard)
  @Post("image")
  @ApiBearerAuth("JWT")
  @ApiSuccess({ summary: "Upload a general image", dataType: "Uploaded image URL and S3 key" })
  @ApiStandardErrors({ unauthorized: true })
  @ApiConsumes("multipart/form-data")
  @ApiQuery({ name: "folder", required: false, enum: ["images", "notifications", "banners"], example: "images" })
  @ApiMultipartFile("image", "Image file. Maximum size: 10MB. Mimetype must start with image/.")
  @UseInterceptors(
    FileInterceptor("image", {
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
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
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query("folder") folder: string = "images"
  ) {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    const allowedFolders = ["images", "notifications", "banners"];
    const targetFolder = allowedFolders.includes(folder) ? folder : "images";

    const result = await this.s3Service.uploadImage(
      file.buffer,
      file.originalname,
      file.mimetype,
      targetFolder
    );

    if (!result.success || !result.url) {
      throw new BadRequestException(result.message || "Upload failed");
    }

    return {
      success: true,
      message: "Image uploaded successfully",
      url: result.url,
      key: result.key,
    };
  }
}
