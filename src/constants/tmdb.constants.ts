/**
 * TMDB API Constants and Limitations
 */

// TMDB API has a hard limit of 500 pages for popular endpoints
export const TMDB_MAX_PAGES = 500;

// Other useful TMDB constants
export const TMDB_DEFAULT_LANGUAGE = "en-US";
export const TMDB_RATE_LIMIT_DELAY = 100; // milliseconds between requests
export const TMDB_RETRY_DELAY = 500; // milliseconds for retries

// TMDB Genre mappings
export const MOVIE_GENRES: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

export const TV_GENRES: Record<number, string> = {
  10759: "Action & Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  10762: "Kids",
  9648: "Mystery",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
  37: "Western",
};

// Combined genre mapping for convenience
export const ALL_GENRES: Record<number, string> = {
  ...MOVIE_GENRES,
  ...TV_GENRES,
};
