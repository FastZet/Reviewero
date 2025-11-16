
import { MediaMetadata, Season, ApiError, InvalidApiKeyError, NotFoundError, RateLimitError } from '../types';
import { loggingService } from './loggingService';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const CORS_PROXY = 'https://cors.eu.org/';

const handleApiResponse = async (response: Response, serviceName: string): Promise<any> => {
    if (response.ok) {
        return response.json();
    }
    const status = response.status;
    let error;
    switch (status) {
        case 401:
            error = new InvalidApiKeyError(serviceName);
            break;
        case 404:
            error = new NotFoundError(`${serviceName} could not find the requested resource.`);
            break;
        case 429:
            error = new RateLimitError(serviceName);
            break;
        default:
            error = new ApiError(`An unexpected error occurred with ${serviceName} (Status: ${status}).`);
            break;
    }
    loggingService.error(`API Error from ${serviceName}: ${error.message}`, { status, url: response.url });
    throw error;
};

const fetchViaProxy = (url: string) => {
    const fullUrl = url.startsWith('https://') ? url : `https://${url}`;
    loggingService.debug(`Fetching via proxy: ${fullUrl}`);
    return fetch(`${CORS_PROXY}${fullUrl}`);
};

interface GetMetadataParams {
  type: 'movie' | 'series';
  imdbId: string;
  season?: number;
  episode?: number;
  apiKey: string;
}

export const getMetadata = async (params: GetMetadataParams): Promise<MediaMetadata | null> => {
  const { type, imdbId, season, episode, apiKey } = params;
  loggingService.info(`Fetching metadata for imdbId: ${imdbId}, type: ${type}`);

  const findUrl = `${TMDB_API_BASE}/find/${imdbId}?api_key=${apiKey}&external_source=imdb_id`;
  const findResponse = await fetchViaProxy(findUrl);
  const findData = await handleApiResponse(findResponse, 'TMDB');

  if (type === 'movie') {
    const movie = findData.movie_results[0];
    if (!movie) throw new NotFoundError(`Movie with IMDb ID ${imdbId} not found.`);
    loggingService.debug(`Found movie: ${movie.title} (TMDB ID: ${movie.id})`);
    return {
      imdbId,
      tmdbId: movie.id,
      type: 'movie',
      title: movie.title,
      year: movie.release_date ? parseInt(movie.release_date.split('-')[0]) : 0,
      overview: movie.overview,
    };
  }

  if (type === 'series') {
    const series = findData.tv_results[0];
    if (!series) throw new NotFoundError(`Series with IMDb ID ${imdbId} not found.`);
    loggingService.debug(`Found series: ${series.name} (TMDB ID: ${series.id})`);

    if (season && episode) {
        loggingService.debug(`Fetching details for Season ${season}, Episode ${episode}`);
        const episodeUrl = `${TMDB_API_BASE}/tv/${series.id}/season/${season}/episode/${episode}?api_key=${apiKey}`;
        const episodeResponse = await fetchViaProxy(episodeUrl);
        const episodeData = await handleApiResponse(episodeResponse, 'TMDB');
        return {
            imdbId,
            tmdbId: series.id,
            type: 'series',
            title: series.name,
            year: series.first_air_date ? parseInt(series.first_air_date.split('-')[0]) : 0,
            overview: episodeData.overview,
            season: season,
            episode: episode,
            episodeTitle: episodeData.name,
        };
    } else {
        return {
            imdbId,
            tmdbId: series.id,
            type: 'series',
            title: series.name,
            year: series.first_air_date ? parseInt(series.first_air_date.split('-')[0]) : 0,
            overview: series.overview,
        };
    }
  }

  return null;
};


interface SearchMetadataParams {
  title: string;
  type: 'movie' | 'series';
  apiKey: string;
}

const getMovieDetails = async (movieId: number, apiKey: string): Promise<{ cast: string[], originCountry: string }> => {
    loggingService.debug(`Fetching extended details for movie ID: ${movieId}`);
    const detailsUrl = `${TMDB_API_BASE}/movie/${movieId}?api_key=${apiKey}`;
    const creditsUrl = `${TMDB_API_BASE}/movie/${movieId}/credits?api_key=${apiKey}`;

    const [detailsRes, creditsRes] = await Promise.all([
        fetchViaProxy(detailsUrl),
        fetchViaProxy(creditsUrl)
    ]);
    
    if (!detailsRes.ok || !creditsRes.ok) {
        loggingService.warn(`Could not fetch full details for movie ID ${movieId}. Failing gracefully.`);
        return { cast: [], originCountry: '' };
    }

    const detailsData = await detailsRes.json();
    const creditsData = await creditsRes.json();

    const cast = creditsData.cast?.slice(0, 3).map((actor: any) => actor.name) || [];
    const originCountry = detailsData.production_countries?.[0]?.iso_3166_1 || '';
    
    return { cast, originCountry };
};

export const searchByTitle = async (params: SearchMetadataParams): Promise<MediaMetadata[]> => {
    const { title, type, apiKey } = params;
    loggingService.info(`Searching for ${type} with title: "${title}"`);
    const endpoint = type === 'movie' ? 'search/movie' : 'search/tv';
    
    const searchUrl = `${TMDB_API_BASE}/${endpoint}?api_key=${apiKey}&query=${encodeURIComponent(title)}`;
    const response = await fetchViaProxy(searchUrl);
    const data = await handleApiResponse(response, 'TMDB');

    if (!data.results || data.results.length === 0) {
        loggingService.warn(`No results found for query: "${title}"`);
        return [];
    }
    
    const results = data.results;
    loggingService.debug(`Found ${results.length} results for query: "${title}"`);

    if (type === 'movie') {
        const detailedResults = await Promise.all(
            results.map(async (result: any): Promise<MediaMetadata> => {
                const details = await getMovieDetails(result.id, apiKey);
                return {
                    tmdbId: result.id,
                    type: 'movie',
                    title: result.title,
                    year: result.release_date ? parseInt(result.release_date.split('-')[0]) : 0,
                    overview: result.overview,
                    cast: details.cast,
                    originCountry: details.originCountry,
                };
            })
        );
        return detailedResults;
    } else { // type === 'series'
        return results.map((result: any): MediaMetadata => ({
            tmdbId: result.id,
            type: 'series',
            title: result.name,
            year: result.first_air_date ? parseInt(result.first_air_date.split('-')[0]) : 0,
            overview: result.overview,
        }));
    }
};

export const getSeriesDetails = async (tmdbId: number, apiKey: string): Promise<Pick<MediaMetadata, 'seasons' | 'imdbId'>> => {
    loggingService.info(`Fetching series details for TMDB ID: ${tmdbId}`);
    const url = `${TMDB_API_BASE}/tv/${tmdbId}?api_key=${apiKey}&append_to_response=external_ids`;
    const response = await fetchViaProxy(url);
    const data = await handleApiResponse(response, 'TMDB');
    
    const seasons: Season[] = data.seasons
        .filter((s: any) => s.season_number > 0)
        .map((s: any) => ({
            season_number: s.season_number,
            episode_count: s.episode_count,
            name: s.name,
        }));
    loggingService.debug(`Found ${seasons.length} seasons for TMDB ID: ${tmdbId}`);

    return {
        seasons,
        imdbId: data.external_ids?.imdb_id || undefined,
    };
};
