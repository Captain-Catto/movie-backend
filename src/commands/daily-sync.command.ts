// TODO: Install nest-commander package to enable this feature
// import { Command, CommandRunner, Option } from "nest-commander";
import { Logger } from "@nestjs/common";
import { DailySyncService } from "../services/daily-sync.service";

interface DailySyncOptions {
  date?: string;
  type?: "movies" | "tv" | "all";
  batchSize?: number;
}

// TODO: Install nest-commander package to enable this feature
// @Command({
//   name: "daily-sync",
//   description: "Sync data from TMDB daily ID exports",
//   options: { isDefault: false },
// })
export class DailySyncCommand /* extends CommandRunner */ {
  private readonly logger = new Logger(DailySyncCommand.name);

  constructor(private readonly dailySyncService: DailySyncService) {
    // super();
  }

  async run(passedParams: string[], options?: DailySyncOptions): Promise<void> {
    try {
      const { date, type = "all", batchSize } = options || {};

      // Parse date or use current date
      const syncDate = date ? new Date(date) : new Date();

      this.logger.log(
        `🚀 Daily sync command: ${type} for ${syncDate.toDateString()}`
      );

      const startTime = Date.now();

      switch (type) {
        case "movies":
          await this.dailySyncService.syncMoviesFromDailyExport(
            syncDate,
            batchSize
          );
          break;
        case "tv":
          await this.dailySyncService.syncTVFromDailyExport(
            syncDate,
            batchSize
          );
          break;
        case "all":
          await this.dailySyncService.syncAllFromDailyExport(syncDate);
          break;
        default:
          throw new Error(
            `Invalid sync type: ${type}. Use 'movies', 'tv', or 'all'`
          );
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `🎉 Command completed in ${Math.round(duration / 1000)}s`
      );

      // Show final stats
      const stats = await this.dailySyncService.getSyncStats();
      this.logger.log("📊 Final stats:", stats);
    } catch (error) {
      this.logger.error("❌ Command failed:", error);
      process.exit(1);
    }
  }

  // @Option({
  //   flags: "-d, --date <date>",
  //   description: "Date for sync (YYYY-MM-DD format). Default: current date",
  // })
  parseDate(val: string): string {
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(val)) {
      throw new Error("Date must be in YYYY-MM-DD format");
    }

    const date = new Date(val);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date provided");
    }

    return val;
  }

  // @Option({
  //   flags: "-t, --type <type>",
  //   description: "Content type to sync: movies, tv, or all",
  //   defaultValue: "all",
  // })
  parseType(val: string): "movies" | "tv" | "all" {
    if (!["movies", "tv", "all"].includes(val)) {
      throw new Error("Type must be 'movies', 'tv', or 'all'");
    }
    return val as "movies" | "tv" | "all";
  }

  // @Option({
  //   flags: "-b, --batch-size <size>",
  //   description: "Batch size for processing items",
  //   defaultValue: 100,
  // })
  parseBatchSize(val: string): number {
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 1 || num > 1000) {
      throw new Error("Batch size must be a number between 1 and 1000");
    }
    return num;
  }
}
