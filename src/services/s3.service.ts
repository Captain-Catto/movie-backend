import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private configService: ConfigService) {
    // AWS Configuration
    this.bucketName =
      this.configService.get<string>("AWS_S3_BUCKET_NAME") ||
      "movie-demo-bucket";

    this.s3Client = new S3Client({
      region: this.configService.get<string>("AWS_REGION") || "us-east-1",
      credentials: {
        accessKeyId: this.configService.get<string>("AWS_ACCESS_KEY_ID"),
        secretAccessKey: this.configService.get<string>(
          "AWS_SECRET_ACCESS_KEY"
        ),
      },
    });

    this.logger.log(`S3 Service initialized with bucket: ${this.bucketName}`);
  }

  /**
   * Upload movie file to S3
   */
  async uploadMovie(
    file: Buffer,
    fileName: string,
    contentType: string
  ): Promise<{
    success: boolean;
    url?: string;
    key?: string;
    message?: string;
  }> {
    try {
      // Sanitize filename for S3 key - remove special characters and encode properly
      const sanitizedFileName = fileName
        .replace(/[^\w\s.-]/g, "") // Remove special characters except word chars, spaces, dots, hyphens
        .replace(/\s+/g, "_") // Replace spaces with underscores
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""); // Remove diacritics (Vietnamese accents)

      const key = `movies/${Date.now()}-${sanitizedFileName}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: contentType,
        // ACL: "public-read", // Removed ACL - will use bucket policy instead
        Metadata: {
          "uploaded-at": new Date().toISOString(),
          "original-name": fileName, // Keep original name in metadata
        },
      });

      await this.s3Client.send(command);

      // Use encodeURIComponent for the key in URL to handle any remaining special chars
      const encodedKey = encodeURIComponent(key).replace(/%2F/g, "/"); // Keep forward slashes
      const publicUrl = `https://${this.bucketName}.s3.${
        process.env.AWS_REGION || "ap-southeast-1"
      }.amazonaws.com/${encodedKey}`;

      this.logger.log(`Movie uploaded successfully: ${key}`);

      return {
        success: true,
        url: publicUrl,
        key: key,
        message: "Movie uploaded successfully to S3",
      };
    } catch (error) {
      this.logger.error("Failed to upload movie to S3:", error);
      return {
        success: false,
        message: `Upload failed: ${error.message}`,
      };
    }
  }

  /**
   * Get signed URL for private streaming (expires in 1 hour)
   */
  async getSignedStreamUrl(key: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 3600, // 1 hour
      });

      return signedUrl;
    } catch (error) {
      this.logger.error("Failed to get signed URL:", error);
      throw error;
    }
  }

  /**
   * Delete movie from S3
   */
  async deleteMovie(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`Movie deleted successfully: ${key}`);
      return true;
    } catch (error) {
      this.logger.error("Failed to delete movie:", error);
      return false;
    }
  }

  /**
   * Get public URL for movie
   */
  getPublicUrl(key: string): string {
    return `https://${this.bucketName}.s3.amazonaws.com/${key}`;
  }

  /**
   * Check if S3 is configured properly
   */
  isConfigured(): boolean {
    const accessKey = this.configService.get<string>("AWS_ACCESS_KEY_ID");
    const secretKey = this.configService.get<string>("AWS_SECRET_ACCESS_KEY");
    const bucket = this.configService.get<string>("AWS_S3_BUCKET_NAME");

    return !!(accessKey && secretKey && bucket);
  }

  /**
   * Get S3 configuration status
   */
  getConfigStatus(): {
    configured: boolean;
    bucket: string;
    region: string;
    hasCredentials: boolean;
  } {
    return {
      configured: this.isConfigured(),
      bucket: this.bucketName,
      region: this.configService.get<string>("AWS_REGION") || "us-east-1",
      hasCredentials: !!(
        this.configService.get<string>("AWS_ACCESS_KEY_ID") &&
        this.configService.get<string>("AWS_SECRET_ACCESS_KEY")
      ),
    };
  }
}
