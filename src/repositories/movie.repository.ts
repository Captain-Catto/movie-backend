import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Like, Brackets } from "typeorm";
import { Movie } from "../entities/movie.entity";
import { PaginatedResult } from "../interfaces/api.interface";

@Injectable()
export class MovieRepository {
  constructor(
    @InjectRepository(Movie)
    private repository: Repository<Movie>
  ) {}

  async findAll(
    page: number = 1,
    limit: number = 24,
    genre?: string,
    year?: number,
    sortBy?: string,
    countries?: string,
    options: { includeBlocked?: boolean } = {}
  ): Promise<PaginatedResult<Movie>> {
    const { includeBlocked = false } = options;
    const queryBuilder = this.repository.createQueryBuilder("movie");

    if (!includeBlocked) {
      queryBuilder.andWhere("movie.isBlocked = :isBlocked", {
        isBlocked: false,
      });
    }

    if (genre) {
      // Handle multiple genres separated by comma
      const genreIds = genre
        .split(",")
        .map((id) => parseInt(id.trim()))
        .filter((id) => !isNaN(id));
      if (genreIds.length > 0) {
        // Use AND logic: movie must contain ALL specified genres
        genreIds.forEach((genreId, index) => {
          queryBuilder.andWhere(`:genre${index} = ANY(movie.genreIds)`, {
            [`genre${index}`]: genreId,
          });
        });
      }
    }

    if (year) {
      queryBuilder.andWhere("EXTRACT(YEAR FROM movie.releaseDate) = :year", {
        year,
      });
    }

    if (countries) {
      // For movies, use originalLanguage as country indicator
      // Countries parameter comes as comma-separated string like "US,KR,JP"
      const countryList = countries.split(",").map((c) => c.trim());
      queryBuilder.andWhere("movie.originalLanguage IN (:...countries)", {
        countries: countryList.map((country) => {
          // Map country codes to language codes
          const countryToLang: Record<string, string> = {
            US: "en",
            KR: "ko",
            JP: "ja",
            CN: "zh",
            VN: "vi",
          };
          return countryToLang[country] || country.toLowerCase();
        }),
      });
    }

    // Handle sorting
    switch (sortBy) {
      case "popularity":
        // Phim đang hot, nhiều người quan tâm
        queryBuilder.orderBy("movie.popularity", "DESC");
        break;
      case "top_rated":
        // Phim được đánh giá cao - sắp xếp theo vote_average DESC và yêu cầu vote_count tối thiểu
        queryBuilder
          .andWhere("movie.voteCount > :minVoteCount", { minVoteCount: 100 })
          .orderBy("movie.voteAverage", "DESC")
          .addOrderBy("movie.voteCount", "DESC");
        break;
      case "now_playing":
        // Phim đang chiếu - sắp xếp theo popularity nhưng có filter ngày
        queryBuilder
          .andWhere("movie.releaseDate <= :currentDate", {
            currentDate: new Date(),
          })
          .andWhere("movie.releaseDate >= :threeMonthsAgo", {
            threeMonthsAgo: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          })
          .orderBy("movie.popularity", "DESC")
          .addOrderBy("movie.releaseDate", "DESC");
        break;
      case "upcoming":
        // Phim sắp ra mắt - chỉ lấy phim có ngày phát hành trong tương lai
        queryBuilder
          .andWhere("movie.releaseDate > :currentDate", {
            currentDate: new Date(),
          })
          .orderBy("movie.releaseDate", "ASC")
          .addOrderBy("movie.popularity", "DESC");
        break;
      case "imdb":
        queryBuilder.orderBy("movie.voteAverage", "DESC");
        break;
      case "views":
        queryBuilder.orderBy("movie.popularity", "DESC");
        break;
      case "updated":
        queryBuilder.orderBy("movie.lastUpdated", "DESC");
        break;
      case "latest":
        // Phim mới ra mắt - handle NULL releaseDate by putting them last
        queryBuilder
          .orderBy("movie.releaseDate", "DESC", "NULLS LAST")
          .addOrderBy("movie.id", "DESC"); // Secondary sort for consistency
        break;
      default:
        // Default: Phim phổ biến (popularity)
        queryBuilder.orderBy("movie.popularity", "DESC");
        break;
    }

    console.log(`🔍 SQL Query for sortBy=${sortBy}:`, queryBuilder.getSql());

    const total = await queryBuilder.getCount();
    const skipAmount = (page - 1) * limit;

    console.log(`🔍 DEBUG MovieRepository.findAll:`, {
      page,
      limit,
      total,
      skipAmount,
      willReturnData: skipAmount < total,
      genre,
      year,
      sortBy,
    });

    const movies = await queryBuilder.skip(skipAmount).take(limit).getMany();

    console.log(`📦 Query result: ${movies.length} movies found`);

    // Debug: Check releaseDate values for latest sort
    if (sortBy === "latest" || !sortBy) {
      const sampleDates = movies.slice(0, 5).map((m) => ({
        id: m.id,
        title: m.title,
        releaseDate: m.releaseDate,
        releaseDateString: m.releaseDate?.toISOString?.() || "NULL",
      }));
      console.log(`📅 Sample release dates:`, sampleDates);
    }

    // TEMP: If high page and no results, let's see what pages DO have data
    if (movies.length === 0 && page > 10) {
      const sampleQuery = await this.repository
        .createQueryBuilder("movie")
        .orderBy("movie.popularity", "DESC")
        .take(5)
        .getMany();
      console.log(
        `📄 Sample movies in DB:`,
        sampleQuery.map((m) => ({
          id: m.id,
          title: m.title,
          popularity: m.popularity,
        }))
      );
    }

    return {
      data: movies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: number): Promise<Movie> {
    return this.repository.findOne({ where: { id } });
  }

  async findByTmdbId(tmdbId: number): Promise<Movie> {
    return this.repository.findOne({ where: { tmdbId } });
  }

  async create(movieData: Partial<Movie>): Promise<Movie> {
    const movie = this.repository.create(movieData);
    return this.repository.save(movie);
  }

  async update(id: number, movieData: Partial<Movie>): Promise<Movie> {
    await this.repository.update(id, movieData);
    return this.findById(id);
  }

  async upsertByTmdbId(
    tmdbId: number,
    movieData: Partial<Movie>
  ): Promise<Movie> {
    const existingMovie = await this.findByTmdbId(tmdbId);

    if (existingMovie) {
      // Skip updating existing data to speed up initial sync
      return existingMovie;
    } else {
      return this.create({ ...movieData, tmdbId });
    }
  }

  async search(
    query: string,
    page: number = 1,
    limit: number = 24
  ): Promise<PaginatedResult<Movie>> {
    // Similarity threshold for fuzzy matching (trigram)
    const SIMILARITY_THRESHOLD = 0.3;

    // Weighted hybrid search query:
    // - FTS (Full-Text Search) for exact word matches = 100 points
    // - Trigram similarity for typo tolerance = similarity * 50 points
    // - Popularity boost = popularity / 100
    // - Rating boost = voteAverage * 2
    const qb = this.repository
      .createQueryBuilder("movie")
      .select("movie")
      .addSelect(
        `(CASE
          WHEN to_tsvector('simple', COALESCE(movie.title, '') || ' ' || COALESCE(movie."originalTitle", '')) @@ plainto_tsquery('simple', :query)
          THEN 100
          ELSE GREATEST(
            similarity(movie.title, :query),
            similarity(COALESCE(movie."originalTitle", ''), :query)
          ) * 50
        END) + (movie.popularity / 100) + (movie."voteAverage" * 2)`,
        "search_rank"
      )
      .where(
        new Brackets((qb) => {
          qb.where(
            `to_tsvector('simple', COALESCE(movie.title, '') || ' ' || COALESCE(movie."originalTitle", '')) @@ plainto_tsquery('simple', :query)`,
            { query }
          )
            .orWhere("similarity(movie.title, :query) > :threshold", {
              query,
              threshold: SIMILARITY_THRESHOLD,
            })
            .orWhere(
              'similarity(COALESCE(movie."originalTitle", \'\'), :query) > :threshold',
              { query, threshold: SIMILARITY_THRESHOLD }
            );
        })
      )
      .andWhere("movie.isBlocked = false")
      .orderBy("search_rank", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const [movies, total] = await qb.getManyAndCount();

    return {
      data: movies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
