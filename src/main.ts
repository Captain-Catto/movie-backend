import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger, LogLevel } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { CamelCaseInterceptor } from "./interceptors/camel-case.interceptor";
import { enhanceOpenApiDocument } from "./swagger/openapi-postprocessor";
import { AdminSettingsService } from "./services/admin-settings.service";
import * as bcrypt from "bcrypt";
import * as compression from "compression";
import helmet from "helmet";
import * as crypto from "crypto";
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

const SWAGGER_SESSION_COOKIE = "ms_swagger_session";
const SWAGGER_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {};

  return cookieHeader.split(";").reduce<Record<string, string>>((acc, part) => {
    const index = part.indexOf("=");
    if (index < 0) return acc;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

function signSwaggerSession(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function createSwaggerSession(username: string, secret: string) {
  const expiresAt = Date.now() + SWAGGER_SESSION_TTL_MS;
  const payload = `${username}:${expiresAt}`;
  const signature = signSwaggerSession(payload, secret);
  return Buffer.from(`${payload}:${signature}`, "utf8").toString("base64url");
}

function verifySwaggerSession(token: string | undefined, secret: string) {
  if (!token) return false;

  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(":");
    if (parts.length !== 3) return false;

    const [username, expiresAtRaw, signature] = parts;
    const expiresAt = Number(expiresAtRaw);
    if (!username || !Number.isFinite(expiresAt) || expiresAt < Date.now()) {
      return false;
    }

    const payload = `${username}:${expiresAtRaw}`;
    const expected = signSwaggerSession(payload, secret);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

function readFormBody(req: any): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString("utf8");
      if (body.length > 10_000) {
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => {
      const params = new URLSearchParams(body);
      resolve({
        username: params.get("username") || "",
        password: params.get("password") || "",
      });
    });
    req.on("error", reject);
  });
}

function renderSwaggerLogin(error?: string) {
  const errorHtml = error
    ? `<div class="error">${escapeHtml(error)}</div>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MovieStream API Docs Login</title>
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0b1220;
      color: #f8fafc;
    }
    .panel {
      width: min(420px, calc(100vw - 32px));
      border: 1px solid #263247;
      border-radius: 12px;
      background: #111827;
      box-shadow: 0 24px 80px rgba(0, 0, 0, .35);
      overflow: hidden;
    }
    .header { padding: 24px 24px 16px; border-bottom: 1px solid #263247; }
    .brand { display: flex; align-items: center; gap: 12px; font-weight: 800; font-size: 20px; }
    .logo {
      width: 36px; height: 36px; border-radius: 9px; background: #ef233c;
      display: grid; place-items: center; font-weight: 900;
    }
    .subtitle { margin: 8px 0 0; color: #94a3b8; font-size: 14px; }
    form { padding: 24px; display: grid; gap: 16px; }
    label { display: grid; gap: 8px; color: #cbd5e1; font-size: 13px; font-weight: 600; }
    input {
      width: 100%; box-sizing: border-box; border: 1px solid #334155; border-radius: 9px;
      background: #0f172a; color: #f8fafc; padding: 12px 13px; font-size: 15px;
      outline: none;
    }
    input:focus { border-color: #ef233c; box-shadow: 0 0 0 3px rgba(239, 35, 60, .18); }
    button {
      border: 0; border-radius: 9px; background: #ef233c; color: white; padding: 12px 14px;
      font-weight: 800; font-size: 15px; cursor: pointer;
    }
    button:hover { background: #dc1f36; }
    .error {
      border: 1px solid rgba(248, 113, 113, .35);
      background: rgba(127, 29, 29, .35);
      color: #fecaca;
      border-radius: 9px;
      padding: 10px 12px;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <main class="panel">
    <div class="header">
      <div class="brand"><div class="logo">▶</div><span>MovieStream API Docs</span></div>
      <p class="subtitle">Sign in with the Swagger credentials configured in Admin Settings.</p>
    </div>
    <form method="post" action="/api-docs-login">
      ${errorHtml}
      <label>
        Username
        <input name="username" autocomplete="username" required autofocus />
      </label>
      <label>
        Password
        <input name="password" type="password" autocomplete="current-password" required />
      </label>
      <button type="submit">Open Swagger</button>
    </form>
  </main>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function swaggerSettingsAuth(
  adminSettingsService: AdminSettingsService,
  sessionSecret: string,
  isProduction: boolean
) {
  return async (req: any, res: any, next: any) => {
    if (req.path === "/api-docs-login" && req.method === "GET") {
      return res.type("html").send(renderSwaggerLogin());
    }

    if (req.path === "/api-docs-login" && req.method === "POST") {
      try {
        const credentials = await readFormBody(req);
        const settings =
          await adminSettingsService.getSwaggerAuthRuntimeSettings();
        const hasAccess =
          settings &&
          credentials.username === settings.username &&
          (await bcrypt.compare(credentials.password, settings.passwordHash));

        if (!hasAccess) {
          return res
            .status(401)
            .type("html")
            .send(renderSwaggerLogin("Invalid Swagger credentials"));
        }

        const token = createSwaggerSession(credentials.username, sessionSecret);
        res.cookie(SWAGGER_SESSION_COOKIE, token, {
          httpOnly: true,
          sameSite: "lax",
          secure: isProduction,
          maxAge: SWAGGER_SESSION_TTL_MS,
          path: "/",
        });
        return res.redirect("/api-docs");
      } catch {
        return res
          .status(400)
          .type("html")
          .send(renderSwaggerLogin("Unable to process login request"));
      }
    }

    if (req.path === "/api-docs-logout") {
      res.clearCookie(SWAGGER_SESSION_COOKIE, { path: "/" });
      return res.redirect("/api-docs-login");
    }

    if (!req.path.startsWith("/api-docs")) {
      return next();
    }

    const cookies = parseCookies(req.headers.cookie);
    const hasSession = verifySwaggerSession(
      cookies[SWAGGER_SESSION_COOKIE],
      sessionSecret
    );

    if (!hasSession) {
      if (req.path === "/api-docs-json") {
        return res.status(401).json({
          success: false,
          message: "Swagger login required",
        });
      }
      return res.redirect("/api-docs-login");
    }

    return next();
  };
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: resolveLogLevels(),
  });
  const configService = app.get(ConfigService);
  const adminSettingsService = app.get(AdminSettingsService);
  const logger = new Logger("Bootstrap");
  const nodeEnv = configService.get<string>("NODE_ENV") || "development";
  const sessionSecret =
    configService.get<string>("JWT_SECRET") ||
    configService.get<string>("SESSION_SECRET") ||
    "moviestream-swagger-dev-secret";

  logger.log(`⏰ Timezone: ${process.env.TZ}`);

  // Protect Swagger before Helmet so docs can be explicitly enabled without exposing them publicly.
  app.use(
    swaggerSettingsAuth(
      adminSettingsService,
      sessionSecret,
      nodeEnv === "production"
    )
  );

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
