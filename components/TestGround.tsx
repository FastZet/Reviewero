
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useApiKeys } from '../hooks/useApiKeys';
import { searchByTitle, getMetadata, getSeriesDetails } from '../services/metadataService';
import { generateReview } from '../services/geminiService';
import { MediaMetadata, ApiError } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { loggingService } from '../services/loggingService';

const LOADING_MESSAGES = [
    "Consulting with the AI critics...",
    "Rummaging through the film archives...",
    "Searching the web for spoiler-free tidbits...",
    "Waking up the Gemini model...",
    "Analyzing cinematic data points...",
    "Crafting the perfect bullet points...",
    "Making sure there are absolutely no spoilers...",
    "Checking the script for plot holes (just kidding!)...",
    "Brewing some coffee while the AI works...",
    "Assembling review fragments...",
];

const TestGround: React.FC = () => {
    const { keys, areKeysSetup, isReady } = useApiKeys();
    const [query, setQuery] = useState('');
    const [type, setType] = useState<'movie' | 'series'>('movie');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [review, setReview] = useState<string[] | null>(null);
    const [searchResults, setSearchResults] = useState<MediaMetadata[] | null>(null);
    const [selectedSeries, setSelectedSeries] = useState<MediaMetadata | null>(null);
    const [selectedSeason, setSelectedSeason] = useState<string>('');
    const [selectedEpisode, setSelectedEpisode] = useState<string>('');
    
    const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
    const intervalRef = useRef<number | null>(null);

    useEffect(() => {
        if (isLoading) {
            intervalRef.current = window.setInterval(() => {
                setLoadingMessage(prevMessage => {
                    let newMessage;
                    do {
                        newMessage = LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];
                    } while (newMessage === prevMessage);
                    return newMessage;
                });
            }, 2000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isLoading]);
    
    const handleGenericError = (err: unknown) => {
        const errorMessage = err instanceof ApiError ? err.message : (err instanceof Error ? err.message : 'An unknown error occurred.');
        loggingService.error(`TestGround Error: ${errorMessage}`, err);
        setError(errorMessage);
    };

    const performReviewGeneration = async (metadata: MediaMetadata) => {
        loggingService.info(`TestGround: Generating review for "${metadata.title}"`);
        const reviewPoints = await generateReview(metadata, keys.gemini);
        if (!reviewPoints || reviewPoints.length === 0) {
            const msg = 'Failed to generate a review. The AI might be busy or the content is too new.';
            loggingService.warn(`TestGround: ${msg}`);
            setError(msg);
        } else {
            loggingService.info(`TestGround: Successfully generated review for "${metadata.title}"`);
            setReview(reviewPoints);
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim() || isLoading) return;

        loggingService.info(`TestGround: Search started for query "${query}" (type: ${type})`);
        setIsLoading(true);
        setError(null);
        setReview(null);
        setSearchResults(null);
        setSelectedSeries(null);
        setLoadingMessage(LOADING_MESSAGES[0]);

        try {
            const imdbIdRegex = /^(tt\d{7,})$/;
            const trimmedQuery = query.trim();

            if (imdbIdRegex.test(trimmedQuery)) {
                loggingService.debug(`TestGround: Query is an IMDb ID: ${trimmedQuery}`);
                const metadata = await getMetadata({ type, imdbId: trimmedQuery, apiKey: keys.tmdb });
                if (!metadata) {
                    setError(`Could not find a ${type} with IMDb ID: ${trimmedQuery}`);
                } else if (type === 'movie') {
                    await performReviewGeneration(metadata);
                } else {
                    await handleSelectResult(metadata);
                }
            } else {
                loggingService.debug(`TestGround: Query is a title search: ${trimmedQuery}`);
                const results = await searchByTitle({ title: trimmedQuery, type, apiKey: keys.tmdb });
                if (results.length === 0) {
                    setError('Could not find any matching results. Try being more specific!');
                } else if (results.length === 1) {
                    loggingService.debug(`TestGround: Found single match, auto-selecting: ${results[0].title}`);
                    await handleSelectResult(results[0]);
                } else {
                    loggingService.debug(`TestGround: Found ${results.length} matches, showing selection.`);
                    setSearchResults(results);
                }
            }
        } catch (err) {
            handleGenericError(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSelectResult = async (metadata: MediaMetadata) => {
        loggingService.info(`TestGround: User selected result: "${metadata.title}"`);
        setSearchResults(null);
        setIsLoading(true);
        setError(null);
        setReview(null);
        
        try {
            if (metadata.type === 'movie') {
                 await performReviewGeneration(metadata);
            } else {
                if (!metadata.tmdbId) {
                    throw new Error("Series is missing a TMDB ID for detail lookup.");
                }
                loggingService.debug(`TestGround: Fetching details for series: ${metadata.title}`);
                const details = await getSeriesDetails(metadata.tmdbId, keys.tmdb);
                setSelectedSeries({ ...metadata, ...details });
                setSelectedSeason('');
                setSelectedEpisode('');
            }
        } catch (err) {
            handleGenericError(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEpisodeReview = async () => {
        if (!selectedSeries || !selectedSeason || !selectedEpisode) return;

        loggingService.info(`TestGround: Generating review for episode S${selectedSeason}E${selectedEpisode} of "${selectedSeries.title}"`);
        setIsLoading(true);
        setError(null);
        setReview(null);

        try {
             const episodeMetadata = await getMetadata({
                type: 'series',
                imdbId: selectedSeries.imdbId || '',
                season: parseInt(selectedSeason),
                episode: parseInt(selectedEpisode),
                apiKey: keys.tmdb,
            });

            if (!episodeMetadata) {
                throw new Error("Could not fetch metadata for the selected episode.");
            }

            await performReviewGeneration(episodeMetadata);

        } catch (err) {
            handleGenericError(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSeasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        loggingService.debug(`TestGround: Season changed to ${e.target.value}`);
        setSelectedSeason(e.target.value);
        setSelectedEpisode('');
    };

    const currentSeasonData = selectedSeries?.seasons?.find(
        (s) => s.season_number === parseInt(selectedSeason)
    );

    if (!isReady) {
        return null; 
    }

    if (!areKeysSetup) {
        return (
            <div className="bg-stremio-surface p-6 rounded-lg shadow-xl text-center">
                <h2 className="text-2xl font-semibold mb-4 flex items-center justify-center">
                    <SparklesIcon className="w-6 h-6 mr-2 text-stremio-primary" />
                    Test Drive the Addon
                </h2>
                <p className="text-stremio-text-secondary">
                    You need to configure your API keys to test the review generation.
                </p>
                <Link to="/configure" className="mt-4 inline-block px-6 py-2 bg-stremio-primary text-white font-bold rounded-md hover:bg-stremio-secondary transition-colors">
                    Go to Configuration
                </Link>
            </div>
        );
    }

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col justify-center items-center pt-8 text-center min-h-[100px]">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stremio-primary"></div>
                   <p className="mt-4 text-stremio-text-secondary animate-pulse">{loadingMessage}</p>
                </div>
            );
        }
        if (error) {
            return (
                <div className="bg-red-900/50 text-red-300 p-4 rounded-md animate-fade-in">
                    <strong>Error:</strong> {error}
                </div>
            );
        }
        if (review) {
             return (
                <div className="bg-stremio-background p-4 rounded-md animate-fade-in">
                    <p className="font-bold text-lg text-stremio-primary mb-3">Generated Review ✨</p>
                    <div className="space-y-1">
                        {review.map((point, index) => (
                            <p key={index} className="text-stremio-text-primary">{point}</p>
                        ))}
                    </div>
                </div>
            );
        }
        if (selectedSeries) {
            return (
                 <div className="bg-stremio-background p-4 rounded-md animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <p className="font-bold text-lg text-stremio-primary">
                            Selected Series: {selectedSeries.title}
                        </p>
                        <button onClick={() => {
                            loggingService.debug('TestGround: User returned to search results.');
                            setSelectedSeries(null)
                        }} className="flex items-center text-sm text-stremio-text-secondary hover:text-stremio-text-primary transition-colors">
                            <ChevronLeftIcon className="w-4 h-4 mr-1" />
                            Back to Search
                        </button>
                    </div>
                     <div className="flex flex-col sm:flex-row gap-2">
                        <select
                            value={selectedSeason}
                            onChange={handleSeasonChange}
                            className="flex-grow px-4 py-2 bg-stremio-surface border border-stremio-secondary rounded-md focus:ring-stremio-primary focus:border-stremio-primary"
                        >
                            <option value="" disabled>Select a Season</option>
                            {selectedSeries.seasons?.map(season => (
                                <option key={season.season_number} value={season.season_number}>
                                    Season {season.season_number} ({season.name})
                                </option>
                            ))}
                        </select>
                        <select
                             value={selectedEpisode}
                             onChange={(e) => setSelectedEpisode(e.target.value)}
                             disabled={!selectedSeason}
                             className="flex-grow px-4 py-2 bg-stremio-surface border border-stremio-secondary rounded-md focus:ring-stremio-primary focus:border-stremio-primary disabled:opacity-50"
                        >
                            <option value="" disabled>Select an Episode</option>
                            {currentSeasonData && Array.from({ length: currentSeasonData.episode_count }, (_, i) => i + 1).map(epNum => (
                                <option key={epNum} value={epNum}>Episode {epNum}</option>
                            ))}
                        </select>
                     </div>
                     <button
                        onClick={handleEpisodeReview}
                        disabled={!selectedEpisode}
                        className="mt-4 w-full px-6 py-2 bg-stremio-primary text-white font-bold rounded-md hover:bg-stremio-secondary transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                     >
                         Generate Episode Review
                     </button>
                 </div>
            );
        }
        if (searchResults) {
             return (
                <div className="bg-stremio-background p-4 rounded-md animate-fade-in">
                    <p className="font-bold text-lg text-stremio-primary mb-3">Multiple results found. Please select one:</p>
                    <div className="space-y-3">
                        {searchResults.map((result) => (
                            <button
                                key={result.tmdbId}
                                onClick={() => handleSelectResult(result)}
                                className="w-full text-left p-3 bg-stremio-surface hover:bg-stremio-secondary rounded-md transition-colors flex justify-between items-center group"
                            >
                                <div>
                                    <div className="font-bold">
                                        {result.title}
                                        {result.year > 0 && <span className="text-stremio-text-secondary ml-2 font-normal">({result.year})</span>}
                                        {result.originCountry && <span className="text-stremio-text-secondary ml-2 font-normal">({result.originCountry})</span>}
                                    </div>
                                    {result.cast && result.cast.length > 0 && (
                                        <div className="text-sm text-stremio-text-secondary mt-1">
                                            <span className="font-semibold">Cast:</span> {result.cast.join(', ')}
                                        </div>
                                    )}
                                </div>
                                <ChevronRightIcon className="w-5 h-5 text-stremio-text-secondary transition-transform group-hover:translate-x-1" />
                            </button>
                        ))}
                    </div>
                </div>
            );
        }
        return <div className="min-h-[100px]"></div>;
    };


    return (
        <div className="bg-stremio-surface p-6 rounded-lg shadow-xl">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
                <SparklesIcon className="w-6 h-6 mr-2 text-stremio-primary" />
                Test Drive the Addon
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 mb-4">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g., The Matrix, The Office, or tt0133093"
                    className="flex-grow px-4 py-2 bg-stremio-background border border-stremio-secondary rounded-md focus:ring-stremio-primary focus:border-stremio-primary"
                />
                <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'movie' | 'series')}
                    className="px-4 py-2 bg-stremio-background border border-stremio-secondary rounded-md focus:ring-stremio-primary focus:border-stremio-primary"
                >
                    <option value="movie">Movie</option>
                    <option value="series">Series</option>
                </select>
                <button
                    type="submit"
                    disabled={isLoading || !query.trim()}
                    className="px-6 py-2 bg-stremio-primary text-white font-bold rounded-md hover:bg-stremio-secondary transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Searching...' : 'Search'}
                </button>
            </form>

            <div className="mt-4">
                {renderContent()}
            </div>
        </div>
    );
};

export default TestGround;
