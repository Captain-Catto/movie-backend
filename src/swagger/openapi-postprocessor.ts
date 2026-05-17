import { OpenAPIObject } from "@nestjs/swagger";

const HTTP_METHODS = new Set(["get", "post", "put", "patch", "delete"]);

const AUTH_PATH_PATTERNS = [
  /^\/api\/admin\b/,
  /^\/admin\b/,
  /^\/api\/chat\b/,
  /^\/chat\b/,
  /^\/api\/favorites\b/,
  /^\/favorites\b/,
  /^\/api\/notifications\b/,
  /^\/notifications\b/,
  /^\/api\/comments\/user\b/,
  /^\/comments\/user\b/,
];

const ADMIN_PATH_PATTERNS = [/^\/api\/admin\b/, /^\/admin\b/];

const PUBLIC_PATH_PATTERNS = [
  /^\/api\/admin\/auth\/login$/,
  /^\/admin\/auth\/login$/,
];

const TAG_BY_PATH: Array<[RegExp, string]> = [
  [/\/auth\b/, "Auth"],
  [/\/movies?\b/, "Movies"],
  [/\/tv\b/, "TV Series"],
  [/\/trending\b/, "Trending"],
  [/\/search\b/, "Search"],
  [/\/people\b/, "People"],
  [/\/favorites\b/, "Favorites"],
  [/\/comments\b/, "Comments"],
  [/\/notifications\b/, "Notifications"],
  [/\/chat\b/, "Chat"],
  [/\/upload\b/, "Upload"],
  [/\/analytics\b/, "Analytics"],
  [/\/seo\b/, "SEO"],
  [/\/settings\b/, "Settings"],
  [/\/sync\b/, "Sync"],
  [/\/recommendations\b/, "Recommendations"],
  [/\/content\b/, "Content"],
];

const ADMIN_TAG_BY_PATH: Array<[RegExp, string]> = [
  [/\/admin\/auth\b/, "Admin - Auth"],
  [/\/admin\/dashboard\b/, "Admin - Dashboard"],
  [/\/admin\/analytics\b/, "Admin - Analytics"],
  [/\/admin\/users\b/, "Admin - Users"],
  [/\/admin\/content\b/, "Admin - Content"],
  [/\/admin\/comments\b/, "Admin - Comments"],
  [/\/admin\/notifications\b/, "Admin - Notifications"],
  [/\/admin\/seo\b/, "Admin - SEO"],
  [/\/admin\/settings\b/, "Admin - Settings"],
  [/\/admin\/sync\b/, "Admin - Sync"],
  [/\/admin\/chat\b/, "Admin - Chat"],
];

export function enhanceOpenApiDocument(document: OpenAPIObject): OpenAPIObject {
  for (const [path, pathItem] of Object.entries(document.paths)) {
    for (const [method, operation] of Object.entries(pathItem || {})) {
      if (!HTTP_METHODS.has(method) || !operation) continue;
      enhanceOperation(path, method, operation as Record<string, any>);
    }
  }

  return document;
}

function enhanceOperation(path: string, method: string, operation: Record<string, any>) {
  operation.summary ||= buildSummary(method, path);
  operation.description ||= "Production API endpoint. Responses use the shared MovieStream wrapper format.";
  operation.tags = operation.tags?.length ? operation.tags : [resolveTag(path)];

  operation.responses ||= {};
  if (!operation.responses["200"] && !operation.responses["201"] && !operation.responses["204"]) {
    operation.responses[method === "post" ? "201" : "200"] = {
      description: "Successful response",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              message: { type: "string", example: "Request completed successfully" },
              data: { nullable: true, example: null },
              pagination: { nullable: true, type: "object", additionalProperties: true },
              meta: { nullable: true, type: "object", additionalProperties: true },
            },
          },
        },
      },
    };
  }

  operation.responses["400"] ||= {
    description: "Invalid request",
    content: {
      "application/json": {
        schema: {
          example: {
            success: false,
            message: "Invalid request",
            error: "Validation failed",
          },
        },
      },
    },
  };

  const isPublicPath = matchesAny(path, PUBLIC_PATH_PATTERNS);

  if (!isPublicPath && matchesAny(path, AUTH_PATH_PATTERNS)) {
    operation.security ||= [{ JWT: [] }];
    operation.responses["401"] ||= {
      description: "Missing or invalid JWT",
      content: {
        "application/json": {
          schema: {
            example: {
              success: false,
              message: "Unauthorized",
              error: "Unauthorized",
            },
          },
        },
      },
    };
  }

  if (!isPublicPath && matchesAny(path, ADMIN_PATH_PATTERNS)) {
    operation.responses["403"] ||= {
      description: "Admin permission required",
      content: {
        "application/json": {
          schema: {
            example: {
              success: false,
              message: "Forbidden",
              error: "Forbidden resource",
            },
          },
        },
      },
    };
  }
}

function buildSummary(method: string, path: string) {
  const cleanPath = path.replace(/^\/api\//, "/").replace(/[{}]/g, "");
  const actionByMethod: Record<string, string> = {
    get: "Get",
    post: "Create or run",
    put: "Update",
    patch: "Update",
    delete: "Delete",
  };

  return `${actionByMethod[method] || method.toUpperCase()} ${cleanPath}`;
}

function resolveTag(path: string) {
  const adminTag = ADMIN_TAG_BY_PATH.find(([pattern]) => pattern.test(path));
  if (adminTag) return adminTag[1];

  const tag = TAG_BY_PATH.find(([pattern]) => pattern.test(path));
  return tag?.[1] || "API";
}

function matchesAny(path: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(path));
}
