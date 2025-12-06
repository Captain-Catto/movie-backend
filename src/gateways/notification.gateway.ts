import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger, UseGuards } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { NotificationService } from "../services/notification.service";
import { NotificationType } from "../entities/notification-template.entity";

interface AuthenticatedSocket extends Socket {
  userId?: number;
  userEmail?: string;
}

@WebSocketGateway({
  cors: {
    origin: [
      "https://movie.lequangtridat.com",
      "http://movie.lequangtridat.com",
      "http://localhost:3000"
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  namespace: "/notifications",
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger("NotificationGateway");
  private connectedUsers = new Map<number, string>(); // userId -> socketId

  constructor(
    private jwtService: JwtService,
    private notificationService: NotificationService
  ) {}

  afterInit(server: Server) {
    this.logger.log("Notification WebSocket Gateway initialized");
  }

  async handleConnection(client: AuthenticatedSocket, ...args: any[]) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        // Simplified log - no client ID details
        this.logger.warn(`WebSocket: No auth token`);
        client.emit("auth:error", {
          message: "No authentication token provided",
        });
        client.disconnect();
        return;
      }

      // Verify JWT token
      try {
        const payload = this.jwtService.verify(token);
        client.userId = payload.sub;
        client.userEmail = payload.email;
      } catch (jwtError) {
        // Simplified error log
        this.logger.error(`WebSocket: Invalid token`);
        client.emit("auth:error", { message: "Invalid authentication token" });
        client.disconnect();
        return;
      }

      // Store connection
      this.connectedUsers.set(client.userId, client.id);

      // Join user to their personal room
      await client.join(`user:${client.userId}`);

      // Simplified connection log - just show role and status
      this.logger.log(`🔌 WebSocket connected: ${client.userEmail}`);

      // Send unread count on connection
      try {
        const unreadCount = await this.notificationService.getUnreadCount(
          client.userId
        );
        client.emit("notification:unread-count", { count: unreadCount });
      } catch (error) {
        // Suppress detailed error logs
        this.logger.error(`WebSocket: Failed to get unread count`);
      }
    } catch (error) {
      // Simplified connection error log
      this.logger.error(`WebSocket: Connection failed`);
      client.emit("auth:error", { message: "Authentication failed" });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);
      // Simplified disconnect log
      this.logger.log(`🔌 WebSocket disconnected: ${client.userEmail}`);
    } else {
      // Suppress anonymous disconnect logs to reduce noise
    }
  }

  /**
   * Client requests to mark notification as read
   */
  @SubscribeMessage("notification:mark-read")
  async handleMarkAsRead(
    @MessageBody() data: { notificationId: number },
    @ConnectedSocket() client: AuthenticatedSocket
  ) {
    try {
      if (!client.userId) {
        client.emit("error", { message: "Not authenticated" });
        return;
      }

      await this.notificationService.markAsRead(
        data.notificationId,
        client.userId
      );

      // Send updated unread count
      const unreadCount = await this.notificationService.getUnreadCount(
        client.userId
      );
      client.emit("notification:unread-count", { count: unreadCount });

      this.logger.log(
        `User ${client.userId} marked notification ${data.notificationId} as read`
      );
    } catch (error) {
      this.logger.error("Error marking notification as read:", error);
      client.emit("error", { message: "Failed to mark notification as read" });
    }
  }

  /**
   * Client requests to mark all notifications as read
   */
  @SubscribeMessage("notification:mark-all-read")
  async handleMarkAllAsRead(@ConnectedSocket() client: AuthenticatedSocket) {
    try {
      if (!client.userId) {
        client.emit("error", { message: "Not authenticated" });
        return;
      }

      await this.notificationService.markAllAsRead(client.userId);

      // Send updated unread count
      client.emit("notification:unread-count", { count: 0 });

      this.logger.log(`User ${client.userId} marked all notifications as read`);
    } catch (error) {
      this.logger.error("Error marking all notifications as read:", error);
      client.emit("error", {
        message: "Failed to mark all notifications as read",
      });
    }
  }

  /**
   * Send notification to specific user
   */
  async sendNotificationToUser(
    userId: number,
    notification: {
      id: number;
      title: string;
      message: string;
      type: NotificationType;
      createdAt: Date;
      metadata?: Record<string, any>;
    }
  ) {
    const socketId = this.connectedUsers.get(userId);

    if (socketId) {
      // Send to connected user
      this.server.to(`user:${userId}`).emit("notification:new", notification);

      // Update unread count
      const unreadCount = await this.notificationService.getUnreadCount(userId);
      this.server
        .to(`user:${userId}`)
        .emit("notification:unread-count", { count: unreadCount });

      this.logger.log(`Sent notification ${notification.id} to user ${userId}`);
      return true;
    } else {
      this.logger.log(
        `User ${userId} not connected, notification ${notification.id} stored for later`
      );
      return false;
    }
  }

  /**
   * Broadcast notification to all connected users
   */
  async broadcastNotification(notification: {
    id: number;
    title: string;
    message: string;
    type: NotificationType;
    createdAt: Date;
  }) {
    // Send to all connected users
    this.server.emit("notification:new", notification);

    // Update unread counts for all connected users
    for (const [userId, socketId] of this.connectedUsers.entries()) {
      try {
        const unreadCount = await this.notificationService.getUnreadCount(
          userId
        );
        this.server
          .to(`user:${userId}`)
          .emit("notification:unread-count", { count: unreadCount });
      } catch (error) {
        this.logger.error(
          `Failed to update unread count for user ${userId}:`,
          error
        );
      }
    }

    this.logger.log(
      `Broadcasted notification ${notification.id} to ${this.connectedUsers.size} connected users`
    );
  }

  /**
   * Send notification to users with specific role
   */
  async sendNotificationToRole(
    role: string,
    notification: {
      id: number;
      title: string;
      message: string;
      type: NotificationType;
      createdAt: Date;
    }
  ) {
    // This would require storing user roles in connection map
    // For now, broadcast to all (can be optimized later)
    await this.broadcastNotification(notification);
    this.logger.log(
      `Sent role-based notification ${notification.id} for role: ${role}`
    );
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      totalConnections: this.server.sockets.sockets.size,
      activeRooms: Array.from(this.server.sockets.adapter.rooms.keys()),
    };
  }
}
