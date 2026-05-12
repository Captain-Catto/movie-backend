import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger, LogLevel } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { CamelCaseInterceptor } from "./interceptors/camel-case.interceptor";
import * as compression from "compression";
import helmet from "helmet";
import "reflect-metadata";

process.env.TZ = "UTC";

function resolveLogLevels(): LogLevel[] {
  const configuredLevels = process.env.LOG_LEVELS;

  if (configuredLevels) {
    return configuredLevels
      .split(",")
      .map((level) => level.trim())
      .filter((level): level is LogLevel =>
        ["log", "error", "warn", "debug", "verbose", "fatal"].includes(level)
      );
  }

  if (process.env.ENABLE_DEBUG_LOGS === "true") {
    return ["error", "warn", "log", "debug", "verbose"];
  }

  return ["error", "warn", "log"];
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: resolveLogLevels(),
  });
  const configService = app.get(ConfigService);
  const logger = new Logger("Bootstrap");

  logger.log(`⏰ Timezone: ${process.env.TZ}`);

  // Skip helmet for Swagger UI path (needs inline scripts/styles)
  app.use((req: any, res: any, next: any) => {
    if (req.path.startsWith("/api-docs")) {
      return next();
    }
    return helmet()(req, res, next);
  });

  // Enable response compression for better performance
  app.use(
    compression({
      filter: (req, res) => {
        if (req.headers["x-no-compression"]) {
          return false;
        }
        return compression.filter(req, res);
      },
      threshold: 1024,
      level: 6,
    })
  );

  // Global interceptor: convert all response keys to camelCase
  app.useGlobalInterceptors(new CamelCaseInterceptor());

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

  // Swagger / OpenAPI setup
  const port = configService.get("PORT") || 8080;
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Movie API")
    .setDescription("REST API for the Movie streaming platform")
    .setVersion("1.0")
    .addBearerAuth(
      { type: "http", scheme: "bearer", bearerFormat: "JWT", description: "Enter JWT token" },
      "JWT"
    )
    .addServer(`http://localhost:${port}`, "Local")
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api-docs", app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}/api`);
  logger.log(`📚 Swagger docs: http://localhost:${port}/api-docs`);
  logger.log(`🌟 Environment: ${configService.get("NODE_ENV")}`);
}

bootstrap();
