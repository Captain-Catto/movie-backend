import { applyDecorators, HttpStatus, Type } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiAcceptedResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from "@nestjs/swagger";

type ApiSuccessOptions = {
  summary: string;
  description?: string;
  dataType?: Type<unknown> | string;
  isArray?: boolean;
  status?: HttpStatus.OK | HttpStatus.CREATED | HttpStatus.ACCEPTED;
};

type ApiErrorOptions = {
  unauthorized?: boolean;
  forbidden?: boolean;
  notFound?: boolean;
  badRequest?: boolean;
};

export function ApiSuccess({
  summary,
  description,
  dataType,
  isArray,
  status = HttpStatus.OK,
}: ApiSuccessOptions) {
  const dataSchema =
    typeof dataType === "string"
      ? { example: dataType }
      : dataType
        ? isArray
          ? { type: "array", items: { $ref: getSchemaPath(dataType) } }
          : { $ref: getSchemaPath(dataType) }
        : { nullable: true, example: null };

  const responseDecorator =
    status === HttpStatus.CREATED
      ? ApiCreatedResponse
      : status === HttpStatus.ACCEPTED
        ? ApiAcceptedResponse
        : ApiOkResponse;

  return applyDecorators(
    ApiOperation({ summary, description }),
    responseDecorator({
      description: "Successful response",
      schema: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Request completed successfully" },
          data: dataSchema,
          pagination: {
            type: "object",
            nullable: true,
            properties: {
              page: { type: "number", example: 1 },
              limit: { type: "number", example: 20 },
              total: { type: "number", example: 120 },
              totalPages: { type: "number", example: 6 },
            },
          },
          meta: { type: "object", nullable: true, additionalProperties: true },
        },
      },
    })
  );
}

export function ApiStandardErrors(options: ApiErrorOptions = {}) {
  const decorators = [
    ApiBadRequestResponse({
      description: "Invalid request",
      schema: {
        example: {
          success: false,
          message: "Invalid request",
          error: "Validation failed",
        },
      },
    }),
  ];

  if (options.unauthorized) {
    decorators.push(
      ApiUnauthorizedResponse({
        description: "Missing or invalid JWT",
        schema: {
          example: {
            success: false,
            message: "Unauthorized",
            error: "Unauthorized",
          },
        },
      })
    );
  }

  if (options.forbidden) {
    decorators.push(
      ApiForbiddenResponse({
        description: "User does not have permission",
        schema: {
          example: {
            success: false,
            message: "Forbidden",
            error: "Forbidden resource",
          },
        },
      })
    );
  }

  if (options.notFound) {
    decorators.push(
      ApiNotFoundResponse({
        description: "Resource not found",
        schema: {
          example: {
            success: false,
            message: "Resource not found",
            error: "Not found",
          },
        },
      })
    );
  }

  return applyDecorators(...decorators);
}

export const ApiIdParam = (name = "id", description = "Numeric identifier") =>
  ApiParam({ name, type: Number, description, example: 1 });

export const ApiTmdbIdParam = (name = "id") =>
  ApiParam({ name, type: Number, description: "TMDB content ID", example: 550 });

export const ApiPaginationQueries = () =>
  applyDecorators(
    ApiQuery({ name: "page", required: false, type: Number, example: 1 }),
    ApiQuery({ name: "limit", required: false, type: Number, example: 20 })
  );

export const ApiLanguageQuery = () =>
  ApiQuery({ name: "language", required: false, type: String, example: "en-US" });

export const ApiMultipartFile = (
  fieldName: "video" | "avatar" | "image",
  description: string
) =>
  ApiBody({
    description,
    schema: {
      type: "object",
      required: [fieldName],
      properties: {
        [fieldName]: {
          type: "string",
          format: "binary",
        },
      },
    },
  });
