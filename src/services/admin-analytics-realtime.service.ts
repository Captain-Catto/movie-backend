import { Injectable, Logger } from "@nestjs/common";
import { AdminAnalyticsService } from "./admin-analytics.service";
import { ActionType } from "../entities";
import type { AdminAnalyticsGateway } from "../gateways/admin-analytics.gateway";

type NormalizedAction = "view" | "click" | "play" | "complete" | "favorite_add" | "favorite_remove";

export interface AnalyticsRealtimeSnapshot {
  views: number;
  clicks: number;
  plays: number;
  favorites: number;
  snapshotId: string;
  updatedAt: string;
}

interface BufferedEvent {
  type: NormalizedAction;
  delta: number;
}

@Injectable()
export class AdminAnalyticsRealtimeService {
  private readonly logger = new Logger(AdminAnalyticsRealtimeService.name);
  private gateway: AdminAnalyticsGateway | null = null;
  private buffer: BufferedEvent[] = [];
  private emitTimer: NodeJS.Timeout | null = null;
  private snapshot: AnalyticsRealtimeSnapshot | null = null;
  private snapshotSequence = 0;
  private lastHydratedAt = 0;

  private readonly emitIntervalMs = 5000;
  private readonly bufferThreshold = 25;
  private readonly snapshotTtlMs = 60000;

  constructor(private readonly adminAnalyticsService: AdminAnalyticsService) {}

  registerGateway(gateway: AdminAnalyticsGateway) {
    this.gateway = gateway;
  }

  /**
   * Lightweight getter for the latest snapshot (hydrates from DB on first call or when TTL expires)
   */
  async getCurrentSnapshot(): Promise<AnalyticsRealtimeSnapshot> {
    if (
      this.snapshot &&
      Date.now() - this.lastHydratedAt < this.snapshotTtlMs
    ) {
      return this.snapshot;
    }

    await this.refreshSnapshotFromDatabase();
    if (!this.snapshot) {
      this.snapshot = {
        views: 0,
        clicks: 0,
        plays: 0,
        favorites: 0,
        updatedAt: new Date().toISOString(),
        snapshotId: `fallback-${++this.snapshotSequence}`,
      };
    }

    return this.snapshot;
  }

  async trackAction(action: string) {
    const normalized = this.normalizeAction(action);
    if (!normalized) {
      return;
    }

    this.enqueueEvent({ type: normalized, delta: 1 });
  }

  async trackFavoriteDelta(delta: number) {
    if (!delta || Number.isNaN(delta)) {
      return;
    }

    const type: NormalizedAction =
      delta > 0 ? "favorite_add" : "favorite_remove";
    this.enqueueEvent({ type, delta: Math.sign(delta) });
  }

  private enqueueEvent(event: BufferedEvent) {
    this.buffer.push(event);

    if (!this.emitTimer) {
      this.emitTimer = setTimeout(
        () => this.flushBuffer(),
        this.emitIntervalMs
      );
    }

    if (this.buffer.length >= this.bufferThreshold) {
      void this.flushBuffer();
    }
  }

  private normalizeAction(action: string): NormalizedAction | null {
    if (!action) {
      return null;
    }

    const value = action.toLowerCase();
    if (value === ActionType.VIEW) return "view";
    if (value === ActionType.CLICK) return "click";
    if (value === ActionType.PLAY) return "play";
    if (value === ActionType.COMPLETE) return "complete";
    return null;
  }

  private async flushBuffer() {
    if (this.emitTimer) {
      clearTimeout(this.emitTimer);
      this.emitTimer = null;
    }

    if (this.buffer.length === 0) {
      return;
    }

    // Take a snapshot of buffered events and clear buffer early
    const events = [...this.buffer];
    this.buffer = [];

    try {
      const snapshot = await this.getCurrentSnapshot();
      if (!snapshot) {
        // Last resort fallback to avoid runtime errors
        this.logger.warn(
          "[Realtime] Snapshot unavailable, skipping emit for current batch"
        );
        return;
      }

      let viewDelta = 0;
      let clickDelta = 0;
      let playDelta = 0;
      let favoriteDelta = 0;

      for (const event of events) {
        switch (event.type) {
          case "view":
            viewDelta += event.delta;
            break;
          case "click":
            clickDelta += event.delta;
            break;
          case "play":
          case "complete":
            playDelta += event.delta;
            break;
          case "favorite_add":
          case "favorite_remove":
            favoriteDelta += event.delta;
            break;
          default:
            break;
        }
      }

      const nextSnapshot: AnalyticsRealtimeSnapshot = {
        ...snapshot,
        views: Math.max(0, snapshot.views + viewDelta),
        clicks: Math.max(0, snapshot.clicks + clickDelta),
        plays: Math.max(0, snapshot.plays + playDelta),
        favorites: Math.max(0, snapshot.favorites + favoriteDelta),
        updatedAt: new Date().toISOString(),
        snapshotId: `rt-${++this.snapshotSequence}`,
      };

      this.snapshot = nextSnapshot;
      this.lastHydratedAt = Date.now();

      if (this.gateway) {
        this.gateway.broadcastUpdate(nextSnapshot);
      }
    } catch (error) {
      this.logger.warn(
        "[Realtime] Failed to emit analytics snapshot",
        (error as Error)?.message
      );
    }
  }

  private async refreshSnapshotFromDatabase() {
    try {
      const [viewStats, clickStats, playStats, favoriteStats] =
        await Promise.all([
          this.adminAnalyticsService.getViewStats(),
          this.adminAnalyticsService.getClickStats(),
          this.adminAnalyticsService.getPlayStats(),
          this.adminAnalyticsService.getFavoriteStats(),
        ]);

      this.snapshot = {
        views: Number(viewStats?.total ?? 0),
        clicks: Number(clickStats?.total ?? 0),
        plays: Number(playStats?.total ?? 0),
        favorites: Number(favoriteStats?.total ?? 0),
        updatedAt: new Date().toISOString(),
        snapshotId: `seed-${++this.snapshotSequence}`,
      };
      this.lastHydratedAt = Date.now();
    } catch (error) {
      this.logger.error(
        "[Realtime] Failed to hydrate snapshot from DB",
        error as Error
      );

      // Ensure snapshot is always defined to keep downstream logic safe
      if (!this.snapshot) {
        this.snapshot = {
          views: 0,
          clicks: 0,
          plays: 0,
          favorites: 0,
          updatedAt: new Date().toISOString(),
          snapshotId: `fallback-${++this.snapshotSequence}`,
        };
      }
    }
  }
}
