
export interface ApiKeys {
  tmdb: string;
  tvdb: string;
  gemini: string;
}

export interface Season {
  season_number: number;
  episode_count: number;
  name: string;
}

export interface MediaMetadata {
  tmdbId?: number;
  imdbId?: string;
  title: string;
  year: number;
  overview: string;
  type: 'movie' | 'series';
  season?: number;
  episode?: number;
  episodeTitle?: string;
  cast?: string[];
  originCountry?: string;
  seasons?: Season[];
}

// Custom Error Types for specific API feedback

/**
 * Base class for custom API errors.
 */
export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Thrown when an API key is invalid or unauthorized.
 */
export class InvalidApiKeyError extends ApiError {
  constructor(serviceName: string) {
    super(`Invalid API key for ${serviceName}. Please check it in the Configuration page.`);
    this.name = 'InvalidApiKeyError';
  }
}

/**
 * Thrown when a resource (e.g., a movie or episode) cannot be found.
 */
export class NotFoundError extends ApiError {
  constructor(message: string = "The requested item could not be found.") {
    super(message);
    this.name = 'NotFoundError';
  }
}

/**
 * Thrown when an API rate limit has been exceeded.
 */
export class RateLimitError extends ApiError {
  constructor(serviceName: string) {
    super(`Rate limit exceeded for ${serviceName}. Please try again later.`);
    this.name = 'RateLimitError';
  }
}

/**
 * Thrown when Gemini blocks content generation due to safety settings.
 */
export class GeminiSafetyError extends ApiError {
    constructor(message: string = "Review generation was blocked due to safety settings.") {
        super(message);
        this.name = 'GeminiSafetyError';
    }
}
