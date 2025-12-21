import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { UserRole } from "../entities/user.entity";
import { AdminAnalyticsRealtimeService } from "../services/admin-analytics-realtime.service";
import type { AnalyticsRealtimeSnapshot } from "../services/admin-analytics-realtime.service";

interface AuthenticatedSocket extends Socket {
  userId?: number;
  userEmail?: string;
  role?: UserRole;
}

@WebSocketGateway({
  cors: {
    origin: [
      "https://movie.lequangtridat.com",
      "http://movie.lequangtridat.com",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  namespace: "/admin-analytics",
})
export class AdminAnalyticsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger("AdminAnalyticsGateway");
  private readonly roomName = "admin-analytics";

  constructor(
    private readonly jwtService: JwtService,
    private readonly realtimeService: AdminAnalyticsRealtimeService
  ) {}

  afterInit() {
    this.realtimeService.registerGateway(this);
    this.logger.log("Admin analytics WebSocket gateway initialized");
  }

  async handleConnection(@ConnectedSocket() client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        client.emit("auth:error", { message: "Missing authentication token" });
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token) as {
        sub: number;
        email?: string;
        role?: UserRole;
      };

      if (
        payload.role !== UserRole.ADMIN &&
        payload.role !== UserRole.SUPER_ADMIN
      ) {
        client.emit("auth:error", {
          message: "Admin privileges are required",
        });
        client.disconnect();
        return;
      }

      client.userId = payload.sub;
      client.userEmail = payload.email;
      client.role = payload.role;

      await client.join(this.roomName);

      // Send latest snapshot immediately after connection
      try {
        const snapshot = await this.realtimeService.getCurrentSnapshot();
        if (snapshot) {
          client.emit("analytics:update", snapshot);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to send initial analytics snapshot: ${
            (error as Error)?.message ?? "unknown error"
          }`
        );
      }

      this.logger.log(
        `🔌 Admin analytics socket connected: ${client.userEmail || client.userId}`
      );
    } catch (error) {
      this.logger.error("Admin analytics socket connection failed");
      client.emit("auth:error", { message: "Authentication failed" });
      client.disconnect();
    }
  }

  handleDisconnect(@ConnectedSocket() client: AuthenticatedSocket) {
    this.logger.log(
      `🔌 Admin analytics socket disconnected: ${client.userEmail || client.userId}`
    );
  }

  broadcastUpdate(snapshot: AnalyticsRealtimeSnapshot) {
    this.server.to(this.roomName).emit("analytics:update", snapshot);
  }
}
