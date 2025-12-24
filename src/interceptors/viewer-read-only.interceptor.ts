import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable, of } from "rxjs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ViewerAuditLog } from "../entities/viewer-audit-log.entity";
import { UserRole } from "../entities/user.entity";

interface ApiResponse {
  success: boolean;
  message?: string;
  data?: any;
}

@Injectable()
export class ViewerReadOnlyInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(ViewerAuditLog)
    private auditLogRepository: Repository<ViewerAuditLog>
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Only intercept if user is VIEWER
    if (user?.role !== UserRole.VIEWER) {
      return next.handle();
    }

    const httpMethod = request.method;

    // Allow GET requests to proceed normally
    if (httpMethod === "GET") {
      return next.handle();
    }

    // Intercept write operations (POST, PUT, PATCH, DELETE)
    if (["POST", "PUT", "PATCH", "DELETE"].includes(httpMethod)) {
      // Log the attempt
      await this.logViewerAttempt(request, user);

      // Return fake success response
      const fakeResponse: ApiResponse = {
        success: true,
        message: this.generateSuccessMessage(request),
        data: this.generateFakeData(request),
      };

      return of(fakeResponse);
    }

    // Default: allow request
    return next.handle();
  }

  private async logViewerAttempt(request: any, user: any): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        userId: user.id,
        endpoint: request.url,
        httpMethod: request.method,
        payload: request.body || null,
        queryParams: request.query || null,
        ipAddress: this.extractIp(request),
        userAgent: request.headers["user-agent"] || null,
        attemptedAction: this.describeAction(request),
      });

      await this.auditLogRepository.save(auditLog);
    } catch (error) {
      console.error("[ViewerReadOnlyInterceptor] Failed to log audit:", error);
    }
  }

  private extractIp(request: any): string | null {
    const forwarded = request.headers["x-forwarded-for"];
    return (
      (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]) ||
      request.ip ||
      request.connection?.remoteAddress ||
      null
    );
  }

  private describeAction(request: any): string {
    const { method, url, body } = request;

    // Parse URL to extract action context
    if (url.includes("/admin/users/ban")) {
      return `Ban user #${body?.userId}`;
    } else if (url.includes("/admin/users/unban")) {
      return `Unban user`;
    } else if (url.includes("/admin/users") && url.includes("/role")) {
      return `Update user role to ${body?.role}`;
    } else if (url.includes("/admin/content/block")) {
      return `Block content ${body?.contentId}`;
    } else if (url.includes("/admin/content/unblock")) {
      return `Unblock content ${body?.contentId}`;
    } else if (url.includes("/admin/notifications/broadcast")) {
      return `Broadcast notification: ${body?.title}`;
    } else if (url.includes("/admin/notifications/role")) {
      return `Send notification to ${body?.role} role`;
    } else if (url.includes("/admin/notifications/user")) {
      return `Send notification to user #${body?.userId}`;
    } else if (url.includes("/admin/notifications/maintenance")) {
      return `Send maintenance notification`;
    } else if (url.includes("/admin/comments") && method === "DELETE") {
      return `Delete comment #${url.split("/").pop()}`;
    } else if (url.includes("/admin/comments") && url.includes("/hide")) {
      return `Hide comment`;
    } else if (url.includes("/admin/seo") && method === "POST") {
      return `Create SEO metadata`;
    } else if (url.includes("/admin/seo") && method === "PUT") {
      return `Update SEO metadata`;
    } else if (url.includes("/admin/seo") && method === "DELETE") {
      return `Delete SEO metadata`;
    } else if (url.includes("/admin/sync") && method === "POST") {
      return `Trigger data sync`;
    }

    // Fallback
    return `${method} ${url}`;
  }

  private generateSuccessMessage(request: any): string {
    const { method, url } = request;

    if (method === "POST" && url.includes("/ban")) {
      return "User banned successfully";
    } else if (method === "POST" && url.includes("/unban")) {
      return "User unbanned successfully";
    } else if (method === "PUT" && url.includes("/role")) {
      return "User role updated successfully";
    } else if (method === "POST" && url.includes("/block")) {
      return "Content blocked successfully";
    } else if (method === "POST" && url.includes("/unblock")) {
      return "Content unblocked successfully";
    } else if (method === "POST" && url.includes("/notifications")) {
      return "Notification sent successfully";
    } else if (method === "DELETE" && url.includes("/notifications")) {
      return "Notification deleted successfully";
    } else if (method === "PUT" && url.includes("/settings")) {
      return "Settings updated successfully";
    } else if (method === "PATCH" && url.includes("/settings")) {
      return "Settings updated successfully";
    } else if (method === "POST" && url.includes("/sync")) {
      return "Data sync started successfully";
    } else if (method === "DELETE" && url.includes("/comments")) {
      return "Comment deleted successfully";
    } else if (method === "PUT" && url.includes("/comments") && url.includes("/hide")) {
      return "Comment hidden successfully";
    } else if (method === "PUT" && url.includes("/comments") && url.includes("/unhide")) {
      return "Comment unhidden successfully";
    } else if (method === "POST" && url.includes("/seo")) {
      return "SEO metadata created successfully";
    } else if (method === "PUT" && url.includes("/seo")) {
      return "SEO metadata updated successfully";
    } else if (method === "DELETE" && url.includes("/seo")) {
      return "SEO metadata deleted successfully";
    } else if (method === "DELETE") {
      return "Resource deleted successfully";
    } else if (method === "PUT" || method === "PATCH") {
      return "Resource updated successfully";
    } else if (method === "POST") {
      return "Resource created successfully";
    }

    return "Operation completed successfully";
  }

  private generateFakeData(request: any): any {
    const { method, body } = request;

    // For DELETE, return null
    if (method === "DELETE") {
      return null;
    }

    // For POST/PUT/PATCH, return the submitted data as if it was saved
    if (body && Object.keys(body).length > 0) {
      // Add common response fields
      return {
        ...body,
        id: body.id || Math.floor(Math.random() * 10000),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Fallback
    return { success: true };
  }
}
