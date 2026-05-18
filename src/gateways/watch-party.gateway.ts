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
import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { WatchPartyService } from "../services/watch-party.service";
import { WatchPartyRepository } from "../repositories/watch-party.repository";

interface PartySocket extends Socket {
  userId: number | null;
  userName: string;
  partyId: number | null;
}

interface ParticipantInfo {
  socketId: string;
  userId: number | null;
  userName: string;
  isHost: boolean;
}

interface ChatEntry {
  userId: number | null;
  userName: string;
  message: string;
  timestamp: number;
}

interface RoomLiveState {
  partyId: number;
  hostId: number;
  hostSocketId: string;
  currentTime: number;
  isPlaying: boolean;
  lastEventAt: number;
  chat: ChatEntry[];
  participants: Map<string, ParticipantInfo>;
}

const CORS_ORIGINS = [
  "https://movie.lequangtridat.com",
  "http://movie.lequangtridat.com",
  "http://localhost:3000",
];

const HOST_RECONNECT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CHAT_HISTORY = 200;

@WebSocketGateway({
  cors: {
    origin: CORS_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
  namespace: "/watch-party",
})
export class WatchPartyGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger = new Logger("WatchPartyGateway");

  // partyId → room live state
  private rooms = new Map<number, RoomLiveState>();

  // partyId → host reconnect timer
  private hostReconnectTimers = new Map<number, NodeJS.Timeout>();

  // socketId → partyId (reverse lookup for disconnect)
  private socketParty = new Map<string, number>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly watchPartyService: WatchPartyService,
    private readonly watchPartyRepository: WatchPartyRepository
  ) {}

  afterInit() {
    this.logger.log("Watch Party WebSocket Gateway initialized");
  }

  async handleConnection(client: PartySocket) {
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.replace("Bearer ", "");

    if (token && token !== "null" && token !== "undefined") {
      try {
        const payload = this.jwtService.verify(token);
        client.userId = payload.sub;
        client.userName = payload.name || payload.email?.split("@")[0] || "User";
      } catch {
        // Invalid token — treat as guest
        client.userId = null;
        client.userName = `Khách_${client.id.slice(0, 4)}`;
      }
    } else {
      client.userId = null;
      client.userName = `Khách_${client.id.slice(0, 4)}`;
    }

    client.partyId = null;
    this.logger.debug(`Connected: ${client.userName} (${client.id})`);
  }

  async handleDisconnect(client: PartySocket) {
    const partyId = this.socketParty.get(client.id);
    if (!partyId) return;

    const room = this.rooms.get(partyId);
    if (!room) return;

    room.participants.delete(client.id);
    this.socketParty.delete(client.id);

    const participantCount = room.participants.size;

    this.server.to(`party:${partyId}`).emit("party:member:left", {
      userName: client.userName,
      userId: client.userId,
      participantCount,
    });

    // If host disconnected, start grace period
    if (room.hostSocketId === client.id) {
      this.logger.log(`Host disconnected from party ${partyId}, starting grace timer`);

      this.server.to(`party:${partyId}`).emit("party:host:disconnected", {
        gracePeriodSeconds: HOST_RECONNECT_TIMEOUT_MS / 1000,
      });

      const timer = setTimeout(async () => {
        this.logger.log(`Host did not reconnect to party ${partyId}, ending party`);
        this.server.to(`party:${partyId}`).emit("party:ended", {
          reason: "Host đã rời phòng",
        });
        await this.watchPartyService.deactivate(partyId);
        this.rooms.delete(partyId);
        this.hostReconnectTimers.delete(partyId);
      }, HOST_RECONNECT_TIMEOUT_MS);

      this.hostReconnectTimers.set(partyId, timer);
    }

    // Clean up empty rooms immediately
    if (participantCount === 0) {
      this.rooms.delete(partyId);
    }

    this.logger.debug(`Disconnected: ${client.userName} from party ${partyId}`);
  }

  @SubscribeMessage("party:join")
  async handleJoin(
    @MessageBody() data: { inviteCode: string },
    @ConnectedSocket() client: PartySocket
  ) {
    try {
      const party = await this.watchPartyRepository.findByInviteCode(data.inviteCode);

      if (!party || !party.isActive || party.expiresAt < new Date()) {
        client.emit("party:error", { message: "Phòng không tồn tại hoặc đã hết hạn" });
        return;
      }

      const partyId = party.id;
      client.partyId = partyId;

      // Cancel host reconnect timer if host rejoins
      if (client.userId !== null && client.userId === party.hostId) {
        const timer = this.hostReconnectTimers.get(partyId);
        if (timer) {
          clearTimeout(timer);
          this.hostReconnectTimers.delete(partyId);
          this.logger.log(`Host reconnected to party ${partyId}`);
          this.server.to(`party:${partyId}`).emit("party:host:reconnected", {});
        }
      }

      // Initialize or update room state
      if (!this.rooms.has(partyId)) {
        this.rooms.set(partyId, {
          partyId,
          hostId: party.hostId,
          hostSocketId: "",
          currentTime: 0,
          isPlaying: false,
          lastEventAt: Date.now(),
          chat: [],
          participants: new Map(),
        });
      }

      const room = this.rooms.get(partyId)!;
      const isHost = client.userId !== null && client.userId === party.hostId;

      if (isHost) {
        room.hostSocketId = client.id;
      }

      const participant: ParticipantInfo = {
        socketId: client.id,
        userId: client.userId,
        userName: client.userName,
        isHost,
      };

      room.participants.set(client.id, participant);
      this.socketParty.set(client.id, partyId);

      await client.join(`party:${partyId}`);

      // Send current state to the new joiner
      client.emit("party:joined", {
        partyId,
        inviteCode: party.inviteCode,
        contentTitle: party.contentTitle,
        streamUrl: party.streamUrl,
        posterUrl: party.posterUrl,
        movieId: party.movieId,
        tvId: party.tvId,
        hostId: party.hostId,
        isHost,
        snapshot: {
          currentTime: room.currentTime,
          isPlaying: room.isPlaying,
          serverTime: Date.now(),
        },
        recentChat: room.chat.slice(-50),
        participants: Array.from(room.participants.values()),
      });

      // Notify others
      this.server.to(`party:${partyId}`).except(client.id).emit("party:member:joined", {
        userName: client.userName,
        userId: client.userId,
        isHost,
        participantCount: room.participants.size,
      });

      this.logger.debug(`${client.userName} joined party ${partyId} (host: ${isHost})`);
    } catch (err) {
      this.logger.error("Error in party:join", err);
      client.emit("party:error", { message: "Không thể tham gia phòng" });
    }
  }

  @SubscribeMessage("party:play")
  async handlePlay(
    @MessageBody() data: { partyId: number; currentTime: number },
    @ConnectedSocket() client: PartySocket
  ) {
    if (!this.isHost(client, data.partyId)) {
      client.emit("party:error", { message: "Chỉ host mới có thể điều khiển video" });
      return;
    }

    const room = this.rooms.get(data.partyId);
    if (!room) return;

    room.isPlaying = true;
    room.currentTime = data.currentTime;
    room.lastEventAt = Date.now();

    await this.watchPartyRepository.extendExpiry(data.partyId);

    this.server.to(`party:${data.partyId}`).emit("party:sync", {
      currentTime: data.currentTime,
      isPlaying: true,
      serverTime: Date.now(),
      triggeredBy: client.userName,
    });
  }

  @SubscribeMessage("party:pause")
  async handlePause(
    @MessageBody() data: { partyId: number; currentTime: number },
    @ConnectedSocket() client: PartySocket
  ) {
    if (!this.isHost(client, data.partyId)) {
      client.emit("party:error", { message: "Chỉ host mới có thể điều khiển video" });
      return;
    }

    const room = this.rooms.get(data.partyId);
    if (!room) return;

    room.isPlaying = false;
    room.currentTime = data.currentTime;
    room.lastEventAt = Date.now();

    await this.watchPartyRepository.extendExpiry(data.partyId);

    this.server.to(`party:${data.partyId}`).emit("party:sync", {
      currentTime: data.currentTime,
      isPlaying: false,
      serverTime: Date.now(),
      triggeredBy: client.userName,
    });
  }

  @SubscribeMessage("party:seek")
  async handleSeek(
    @MessageBody() data: { partyId: number; currentTime: number },
    @ConnectedSocket() client: PartySocket
  ) {
    if (!this.isHost(client, data.partyId)) {
      client.emit("party:error", { message: "Chỉ host mới có thể điều khiển video" });
      return;
    }

    const room = this.rooms.get(data.partyId);
    if (!room) return;

    room.currentTime = data.currentTime;
    room.lastEventAt = Date.now();

    await this.watchPartyRepository.extendExpiry(data.partyId);

    this.server.to(`party:${data.partyId}`).emit("party:sync", {
      currentTime: data.currentTime,
      isPlaying: room.isPlaying,
      serverTime: Date.now(),
      triggeredBy: client.userName,
    });
  }

  @SubscribeMessage("party:chat")
  handleChat(
    @MessageBody() data: { partyId: number; message: string },
    @ConnectedSocket() client: PartySocket
  ) {
    const room = this.rooms.get(data.partyId);
    if (!room) return;

    const message = String(data.message || "").trim().slice(0, 200);
    if (!message) return;

    const entry: ChatEntry = {
      userId: client.userId,
      userName: client.userName,
      message,
      timestamp: Date.now(),
    };

    room.chat.push(entry);
    if (room.chat.length > MAX_CHAT_HISTORY) {
      room.chat.shift();
    }

    this.server.to(`party:${data.partyId}`).emit("party:chat:message", entry);
  }

  @SubscribeMessage("party:leave")
  async handleLeave(
    @MessageBody() data: { partyId: number },
    @ConnectedSocket() client: PartySocket
  ) {
    await client.leave(`party:${data.partyId}`);
    const room = this.rooms.get(data.partyId);
    if (room) {
      room.participants.delete(client.id);
      this.socketParty.delete(client.id);
      this.server.to(`party:${data.partyId}`).emit("party:member:left", {
        userName: client.userName,
        userId: client.userId,
        participantCount: room.participants.size,
      });
    }
    client.partyId = null;
  }

  private isHost(client: PartySocket, partyId: number): boolean {
    const room = this.rooms.get(partyId);
    return !!room && room.hostSocketId === client.id;
  }
}
