import {
  Controller,
  Get,
  Param,
  Res,
  HttpStatus,
  HttpCode,
} from "@nestjs/common";
import { Response } from "express";
import { join } from "path";
import { existsSync } from "fs";
import { ApiResponse } from "../interfaces/api.interface";

@Controller("demo")
export class DemoController {
  // Demo movies list
  private readonly demoMovies = [
    {
      id: "demo-1",
      title: "Big Buck Bunny",
      description: "Phim hoạt hình ngắn mã nguồn mở từ Blender Foundation",
      year: 2008,
      duration: "9:56",
      genre: "Animation",
      poster:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/800px-Big_buck_bunny_poster_big.jpg",
      videoUrl:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      localFile: "big-buck-bunny.mp4",
    },
    {
      id: "demo-2",
      title: "Elephant Dream",
      description:
        "Phim hoạt hình ngắn đầu tiên được làm hoàn toàn bằng phần mềm mã nguồn mở",
      year: 2006,
      duration: "10:53",
      genre: "Animation",
      poster:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Elephants_Dream_s5_proog.jpg/800px-Elephants_Dream_s5_proog.jpg",
      videoUrl:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      localFile: "elephant-dream.mp4",
    },
    {
      id: "your-movie",
      title: "Your Demo Movie",
      description: "Phim demo của bạn",
      year: 2024,
      duration: "N/A",
      genre: "Demo",
      poster: "/api/demo/poster/your-movie.jpg",
      videoUrl: "/api/demo/stream/your-movie.mp4",
      localFile: "your-movie.mp4",
    },
  ];

  @Get("movies")
  @HttpCode(HttpStatus.OK)
  async getDemoMovies(): Promise<ApiResponse> {
    try {
      return {
        success: true,
        message: "Demo movies retrieved successfully",
        data: this.demoMovies,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get demo movies: ${error.message}`,
        data: [],
      };
    }
  }

  @Get("movie/:id")
  @HttpCode(HttpStatus.OK)
  async getDemoMovie(@Param("id") id: string): Promise<ApiResponse> {
    try {
      const movie = this.demoMovies.find((m) => m.id === id);

      if (!movie) {
        return {
          success: false,
          message: "Demo movie not found",
          data: null,
        };
      }

      return {
        success: true,
        message: "Demo movie retrieved successfully",
        data: movie,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get demo movie: ${error.message}`,
        data: null,
      };
    }
  }

  @Get("stream/:filename")
  async streamMovie(
    @Param("filename") filename: string,
    @Res() res: Response
  ): Promise<void> {
    try {
      // Check if file exists in demo folder
      const filePath = join(process.cwd(), "demo-movies", filename);

      if (!existsSync(filePath)) {
        res.status(404).json({
          success: false,
          message: `Demo movie file not found: ${filename}. Please add your movie file to /demo-movies/ folder`,
        });
        return;
      }

      // Set proper headers for video streaming
      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Cache-Control", "no-cache");

      // Stream the file
      const fs = require("fs");
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = res.req.headers.range;

      if (range) {
        // Handle range requests for seeking
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = end - start + 1;
        const file = fs.createReadStream(filePath, { start, end });

        res.status(206);
        res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
        res.setHeader("Content-Length", chunksize);
        file.pipe(res);
      } else {
        // Stream entire file
        res.setHeader("Content-Length", fileSize);
        const file = fs.createReadStream(filePath);
        file.pipe(res);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Streaming failed: ${error.message}`,
      });
    }
  }

  @Get("poster/:filename")
  async streamPoster(
    @Param("filename") filename: string,
    @Res() res: Response
  ): Promise<void> {
    try {
      const filePath = join(process.cwd(), "demo-movies", "posters", filename);

      if (!existsSync(filePath)) {
        // Return default poster if file not found
        res.redirect(
          "https://via.placeholder.com/400x600/1f2937/ffffff?text=Demo+Movie"
        );
        return;
      }

      res.setHeader("Content-Type", "image/jpeg");
      res.sendFile(filePath);
    } catch (error) {
      res.redirect(
        "https://via.placeholder.com/400x600/1f2937/ffffff?text=Error"
      );
    }
  }
}
