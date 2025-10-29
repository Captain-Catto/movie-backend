import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Movie } from "../entities/movie.entity";
import { TVSeries } from "../entities/tv-series.entity";
import { User } from "../entities/user.entity";
import { SyncStatus } from "../entities/sync-status.entity";

export interface DashboardStats {
  totalMovies: number;
  totalTVSeries: number;
  totalUsers: number;
  totalContent: number;
  todaySignups: number;
  monthlyGrowth: number;
  lastSyncDate: Date | null;
  syncStatus: string;
}

@Injectable()
export class AdminDashboardService {
  private readonly logger = new Logger(AdminDashboardService.name);

  constructor(
    @InjectRepository(Movie)
    private movieRepository: Repository<Movie>,
    @InjectRepository(TVSeries)
    private tvRepository: Repository<TVSeries>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(SyncStatus)
    private syncStatusRepository: Repository<SyncStatus>
  ) {}

  async getDashboardStats(): Promise<DashboardStats> {
    try {
      // Get total counts
      const totalMovies = await this.movieRepository.count();
      const totalTVSeries = await this.tvRepository.count();
      const totalUsers = await this.userRepository.count();

      // Get today's signups
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaySignups = await this.userRepository
        .createQueryBuilder("user")
        .where("user.createdAt >= :today", { today })
        .getCount();

      // Get monthly growth
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const lastMonthUsers = await this.userRepository
        .createQueryBuilder("user")
        .where("user.createdAt >= :lastMonth", { lastMonth })
        .getCount();

      const previousMonthStart = new Date();
      previousMonthStart.setMonth(previousMonthStart.getMonth() - 2);
      const previousMonthUsers = await this.userRepository
        .createQueryBuilder("user")
        .where("user.createdAt >= :previousMonthStart", { previousMonthStart })
        .andWhere("user.createdAt < :lastMonth", { lastMonth })
        .getCount();

      const monthlyGrowth =
        previousMonthUsers > 0
          ? ((lastMonthUsers - previousMonthUsers) / previousMonthUsers) * 100
          : 0;

      // Get last sync status
      const lastSync = await this.syncStatusRepository.findOne({
        where: {},
        order: { lastUpdated: "DESC" },
      });

      return {
        totalMovies,
        totalTVSeries,
        totalUsers,
        totalContent: totalMovies + totalTVSeries,
        todaySignups,
        monthlyGrowth: Math.round(monthlyGrowth * 10) / 10,
        lastSyncDate: lastSync?.lastUpdated || null,
        syncStatus: lastSync?.category || "unknown",
      };
    } catch (error) {
      this.logger.error("Error fetching dashboard stats:", error);
      throw error;
    }
  }

  async getUserGrowthData(
    days: number = 30
  ): Promise<{ date: string; count: number }[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const users = await this.userRepository
        .createQueryBuilder("user")
        .select("DATE(user.createdAt)", "date")
        .addSelect("COUNT(*)", "count")
        .where("user.createdAt >= :startDate", { startDate })
        .groupBy("DATE(user.createdAt)")
        .orderBy("DATE(user.createdAt)", "ASC")
        .getRawMany();

      return users.map((u) => ({
        date: u.date,
        count: parseInt(u.count),
      }));
    } catch (error) {
      this.logger.error("Error fetching user growth data:", error);
      throw error;
    }
  }

  async getContentByMonth(
    months: number = 6
  ): Promise<{ month: string; movies: number; tvSeries: number }[]> {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const movies = await this.movieRepository
        .createQueryBuilder("movie")
        .select("TO_CHAR(movie.createdAt, 'YYYY-MM')", "month")
        .addSelect("COUNT(*)", "count")
        .where("movie.createdAt >= :startDate", { startDate })
        .groupBy("TO_CHAR(movie.createdAt, 'YYYY-MM')")
        .orderBy("TO_CHAR(movie.createdAt, 'YYYY-MM')", "ASC")
        .getRawMany();

      const tvSeries = await this.tvRepository
        .createQueryBuilder("tv")
        .select("TO_CHAR(tv.createdAt, 'YYYY-MM')", "month")
        .addSelect("COUNT(*)", "count")
        .where("tv.createdAt >= :startDate", { startDate })
        .groupBy("TO_CHAR(tv.createdAt, 'YYYY-MM')")
        .orderBy("TO_CHAR(tv.createdAt, 'YYYY-MM')", "ASC")
        .getRawMany();

      // Merge data
      const monthsMap = new Map();
      movies.forEach((m) => {
        monthsMap.set(m.month, {
          month: m.month,
          movies: parseInt(m.count),
          tvSeries: 0,
        });
      });
      tvSeries.forEach((tv) => {
        if (monthsMap.has(tv.month)) {
          monthsMap.get(tv.month).tvSeries = parseInt(tv.count);
        } else {
          monthsMap.set(tv.month, {
            month: tv.month,
            movies: 0,
            tvSeries: parseInt(tv.count),
          });
        }
      });

      return Array.from(monthsMap.values());
    } catch (error) {
      this.logger.error("Error fetching content by month:", error);
      throw error;
    }
  }
}
