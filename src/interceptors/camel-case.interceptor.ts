import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

/**
 * Converts a snake_case string to camelCase.
 * Examples: "poster_path" → "posterPath", "vote_average" → "voteAverage"
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());
}

/**
 * Recursively converts all object keys from snake_case to camelCase.
 * Handles nested objects, arrays, and preserves non-object values.
 */
function toCamelCaseKeys(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (data instanceof Date) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(toCamelCaseKeys);
  }

  if (typeof data === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[snakeToCamel(key)] = toCamelCaseKeys(value);
    }
    return result;
  }

  return data;
}

/**
 * Global NestJS interceptor that converts all response object keys
 * from snake_case to camelCase before sending to the client.
 *
 * This ensures consistent camelCase field naming in all API responses,
 * regardless of whether the source data comes from the database (already camelCase)
 * or from TMDB API (snake_case).
 */
@Injectable()
export class CamelCaseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => toCamelCaseKeys(data)));
  }
}
