import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import * as compression from "compression";
import "reflect-metadata";

process.env.TZ = "UTC";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger("Bootstrap");

  logger.log(`⏰ Timezone: ${process.env.TZ}`);

  // Enable response compression for better performance
  app.use(
    compression({
      filter: (req, res) => {
        // Don't compress if request specifies no-transform
        if (req.headers["x-no-compression"]) {
          return false;
        }
        // Use compression filter function
        return compression.filter(req, res);
      },
      // Only compress responses larger than 1KB
      threshold: 1024,
      level: 6, // Compression level (0-9, 6 is default and balanced)
    })
  );

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Enable CORS with whitelist
  app.enableCors({
    origin: [
      "https://movie.lequangtridat.com",
      "http://movie.lequangtridat.com",
      "http://localhost:3000",
    ],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix("api");

  const port = configService.get("PORT") || 8080;
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}/api`);
  logger.log(`🌟 Environment: ${configService.get("NODE_ENV")}`);
}

bootstrap();
