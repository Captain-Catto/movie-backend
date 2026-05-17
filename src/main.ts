import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger, LogLevel } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { CamelCaseInterceptor } from "./interceptors/camel-case.interceptor";
import { enhanceOpenApiDocument } from "./swagger/openapi-postprocessor";
import { UserRepository } from "./repositories/user.repository";
import { UserRole } from "./entities/user.entity";
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

function parseBasicAuth(req: any) {
  const authHeader = req.headers.authorization || "";
  const [scheme, encoded] = authHeader.split(" ");

  if (scheme !== "Basic" || !encoded) {
    return null;
  }

  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex < 0) {
    return null;
  }

  return {
    username: decoded.slice(0, separatorIndex),
    password: decoded.slice(separatorIndex + 1),
  };
}

function swaggerAdminAuth(userRepository: UserRepository) {
  const allowedRoles = [UserRole.VIEWER, UserRole.ADMIN, UserRole.SUPER_ADMIN];

  return async (req: any, res: any, next: any) => {
    if (!req.path.startsWith("/api-docs")) {
      return next();
    }

    const credentials = parseBasicAuth(req);
    if (!credentials) {
      res.setHeader("WWW-Authenticate", 'Basic realm="MovieStream API Docs"');
      return res.status(401).send("Authentication required");
    }

    try {
      const user = await userRepository.findByEmail(credentials.username);
      const hasAccess =
        user &&
        user.isActive &&
        allowedRoles.includes(user.role) &&
        user.password &&
        (await user.comparePassword(credentials.password));

      if (!hasAccess) {
        res.setHeader("WWW-Authenticate", 'Basic realm="MovieStream API Docs"');
        return res.status(401).send("Invalid admin credentials");
      }

      return next();
    } catch {
      res.setHeader("WWW-Authenticate", 'Basic realm="MovieStream API Docs"');
      return res.status(401).send("Invalid credentials");
    }
  };
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: resolveLogLevels(),
  });
  const configService = app.get(ConfigService);
  const userRepository = app.get(UserRepository);
  const logger = new Logger("Bootstrap");

  logger.log(`⏰ Timezone: ${process.env.TZ}`);

  // Protect Swagger before Helmet so docs can be explicitly enabled without exposing them publicly.
  app.use(swaggerAdminAuth(userRepository));

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
    .setTitle("MovieStream API")
    .setDescription(
      [
        "Production REST API for the MovieStream platform.",
        "",
        "Use the Authorize button with a JWT bearer token for authenticated user and admin endpoints.",
        "All normal responses use the shared wrapper shape: success, message, data, pagination, meta, error.",
      ].join("\n")
    )
    .setVersion("1.0")
    .addBearerAuth(
      { type: "http", scheme: "bearer", bearerFormat: "JWT", description: "Enter JWT token" },
      "JWT"
    )
    .addServer(`http://localhost:${port}`, "Local")
    .addServer("https://api-movie.lequangtridat.com", "Production")
    .addTag("Auth", "Registration, login, profile, token refresh, and logout")
    .addTag("Movies", "Movie catalog, details, credits, videos, and recommendations")
    .addTag("TV Series", "TV catalog, details, seasons, credits, videos, and recommendations")
    .addTag("Trending", "Trending movie and TV catalog")
    .addTag("Search", "Search and recent search management")
    .addTag("People", "Popular people, actor search, profiles, credits, and cache utilities")
    .addTag("Favorites", "Authenticated user's favorite content")
    .addTag("Comments", "Comments, replies, likes, reports, and comment utilities")
    .addTag("Notifications", "Authenticated user's notifications")
    .addTag("Chat", "Authenticated AI movie assistant sessions and messages")
    .addTag("Upload", "Video, avatar, and image uploads")
    .addTag("Analytics", "Client analytics tracking")
    .addTag("SEO", "Public SEO metadata resolution")
    .addTag("Settings", "Public runtime settings")
    .addTag("Sync", "Manual sync operations")
    .addTag("Recommendations", "Recommendation cache operations")
    .addTag("Content", "Content lookup and stream URL resolution")
    .addTag("Admin - Auth", "Admin authentication and promotion")
    .addTag("Admin - Dashboard", "Admin dashboard summaries")
    .addTag("Admin - Analytics", "Admin analytics reports")
    .addTag("Admin - Users", "Admin user management, audit logs, activity, and watch history")
    .addTag("Admin - Content", "Admin content blocking and trending controls")
    .addTag("Admin - Comments", "Admin comment moderation")
    .addTag("Admin - Notifications", "Admin notification campaigns")
    .addTag("Admin - SEO", "Admin SEO metadata management")
    .addTag("Admin - Settings", "Admin runtime settings")
    .addTag("Admin - Sync", "Admin sync settings and manual jobs")
    .addTag("Admin - Chat", "Admin chatbot moderation")
    .build();

  const document = enhanceOpenApiDocument(SwaggerModule.createDocument(app, swaggerConfig));
  app.use("/api-docs-json", (_req: any, res: any) => res.json(document));
  SwaggerModule.setup("api-docs", app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}/api`);
  logger.log(`📚 Swagger docs: http://localhost:${port}/api-docs`);
  logger.log(`📄 OpenAPI JSON: http://localhost:${port}/api-docs-json`);
  logger.log(`🌟 Environment: ${configService.get("NODE_ENV")}`);
}

bootstrap();
