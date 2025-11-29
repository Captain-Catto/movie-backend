// TMDB API Interface Definitions
// Centralized type definitions for The Movie Database (TMDB) API responses

/**
 * TMDB Movie Interface
 * Represents a movie from TMDB API
 */
export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
  original_language: string;
  adult: boolean;
}

/**
 * TMDB TV Series Interface
 * Represents a TV series from TMDB API
 */
export interface TMDBTVSeries {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
  original_language: string;
  origin_country: string[];
}

/**
 * TMDB Trending Item Interface
 * Represents a trending item (movie or TV) from TMDB API
 */
export interface TMDBTrending {
  id: number;
  media_type: "movie" | "tv";
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
  original_language: string;
  adult?: boolean;
}

/**
 * TMDB Paginated Response Interface
 * Generic interface for paginated TMDB API responses
 */
export interface TMDBPaginatedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

/**
 * TMDB Movie Response Interface
 * Paginated response for movies
 */
export interface TMDBMovieResponse extends TMDBPaginatedResponse<TMDBMovie> {}

/**
 * TMDB TV Response Interface
 * Paginated response for TV series
 */
export interface TMDBTVResponse extends TMDBPaginatedResponse<TMDBTVSeries> {}

/**
 * TMDB Trending Response Interface
 * Paginated response for trending items
 */
export interface TMDBTrendingResponse
  extends TMDBPaginatedResponse<TMDBTrending> {}

/**
 * TMDB Cast Interface
 * Represents a cast member in credits
 */
export interface TMDBCast {
  id: number;
  name: string;
  original_name: string;
  character: string;
  profile_path: string | null;
  cast_id: number;
  credit_id: string;
  order: number;
  adult: boolean;
  gender: number;
  known_for_department: string;
  popularity: number;
}

/**
 * TMDB Crew Interface
 * Represents a crew member in credits
 */
export interface TMDBCrew {
  id: number;
  name: string;
  original_name: string;
  job: string;
  department: string;
  profile_path: string | null;
  credit_id: string;
  adult: boolean;
  gender: number;
  known_for_department: string;
  popularity: number;
}

/**
 * TMDB Credits Interface
 * Represents cast and crew credits for a movie/TV show
 */
export interface TMDBCredits {
  id: number;
  cast: TMDBCast[];
  crew: TMDBCrew[];
}

/**
 * TMDB Person Interface
 * Represents a person in search or popular people results
 */
export interface TMDBPerson {
  id: number;
  name: string;
  original_name: string;
  profile_path: string | null;
  adult: boolean;
  popularity: number;
  known_for_department: string;
  known_for: Array<{
    id: number;
    title?: string;
    name?: string;
    media_type: "movie" | "tv";
    poster_path: string | null;
    release_date?: string;
    first_air_date?: string;
    vote_average: number;
    overview: string;
  }>;
}

/**
 * TMDB Person Details Interface
 * Detailed information about a person
 */
export interface TMDBPersonDetails {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
  popularity: number;
  adult: boolean;
  gender: number;
  homepage: string | null;
  imdb_id: string | null;
}

/**
 * TMDB Person Credits Interface
 * Credits for a person (movies/TV shows they appeared in)
 */
export interface TMDBPersonCredits {
  id: number;
  cast: Array<{
    id: number;
    title?: string;
    name?: string;
    character: string;
    media_type: "movie" | "tv";
    poster_path: string | null;
    release_date?: string;
    first_air_date?: string;
    vote_average: number;
    overview: string;
    genre_ids: number[];
  }>;
  crew: Array<{
    id: number;
    title?: string;
    name?: string;
    job: string;
    department: string;
    media_type: "movie" | "tv";
    poster_path: string | null;
    release_date?: string;
    first_air_date?: string;
    vote_average: number;
    overview: string;
    genre_ids: number[];
  }>;
}

/**
 * Paginated Person Credits Interface
 * Person credits with pagination metadata
 */
export interface PaginatedPersonCredits {
  id: number;
  cast: Array<{
    id: number;
    title?: string;
    name?: string;
    character: string;
    media_type: "movie" | "tv";
    poster_path: string | null;
    release_date?: string;
    first_air_date?: string;
    vote_average: number;
    overview: string;
    genre_ids: number[];
  }>;
  crew: Array<{
    id: number;
    title?: string;
    name?: string;
    job: string;
    department: string;
    media_type: "movie" | "tv";
    poster_path: string | null;
    release_date?: string;
    first_air_date?: string;
    vote_average: number;
    overview: string;
    genre_ids: number[];
  }>;
  pagination: {
    current_page: number;
    total_pages: number;
    total_results: number;
    page_size: number;
  };
}

/**
 * TMDB People Response Interface
 * Paginated response for people search
 */
export interface TMDBPeopleResponse extends TMDBPaginatedResponse<TMDBPerson> {}

/**
 * TMDB Video Interface
 * Represents a video (trailer, teaser, etc.)
 */
export interface TMDBVideo {
  id: string;
  iso_639_1: string;
  iso_3166_1: string;
  key: string;
  name: string;
  site: string;
  size: number;
  type: string;
  official: boolean;
  published_at: string;
}

/**
 * TMDB Videos Response Interface
 * Response containing videos for a movie/TV show
 */
export interface TMDBVideosResponse {
  id: number;
  results: TMDBVideo[];
}

/**
 * TMDB Movie Details Interface
 * Enhanced movie details with additional fields
 */
export interface TMDBMovieDetails extends TMDBMovie {
  genres: Array<{ id: number; name: string }>;
  production_countries: Array<{ iso_3166_1: string; name: string }>;
  production_companies: Array<{
    id: number;
    name: string;
    logo_path: string | null;
    origin_country: string;
  }>;
  runtime: number;
  status: string;
  tagline: string;
}

/**
 * TMDB TV Details Interface
 * Enhanced TV series details with additional fields
 */
export interface TMDBTVDetails extends TMDBTVSeries {
  genres: Array<{ id: number; name: string }>;
  production_countries: Array<{ iso_3166_1: string; name: string }>;
  production_companies: Array<{
    id: number;
    name: string;
    logo_path: string | null;
    origin_country: string;
  }>;
  number_of_seasons: number;
  number_of_episodes: number;
  episode_run_time: number[];
  status: string;
  tagline: string;
  last_air_date: string;
}
