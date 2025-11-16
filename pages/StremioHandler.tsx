
import React, { useState, useEffect } from 'react';
import { useApiKeys } from '../hooks/useApiKeys';
import { getMetadata } from '../services/metadataService';
import { generateReview } from '../services/geminiService';
import { ApiError } from '../types';
import { loggingService } from '../services/loggingService';

interface StremioHandlerProps {
  pathname: string;
}

const createErrorStream = (message: string) => ({
    streams: [{
        name: "Error",
        title: message,
        behaviorHints: { notPlayable: true }
    }]
});

const StremioHandler: React.FC<StremioHandlerProps> = ({ pathname }) => {
  const [response, setResponse] = useState<object | null>(null);
  const { keys, isReady, areKeysSetup } = useApiKeys();

  useEffect(() => {
    const handleRequest = async () => {
      loggingService.info(`Stremio request received: ${pathname}`);
      
      if (!pathname.startsWith('/stream/')) {
        // This component should not handle non-stream requests.
        loggingService.warn(`StremioHandler received an unexpected path: ${pathname}`);
        return;
      }

      if (!isReady) {
        loggingService.warn('Stremio request handled before API keys were ready.');
        // Don't return an error stream here, as the keys might just be loading.
        // Let it fall through, and if keys are missing after ready, it will be handled.
        return;
      }

      if (!areKeysSetup) {
        const errorMsg = "API keys not configured. Please configure the addon.";
        loggingService.error(errorMsg);
        setResponse(createErrorStream(errorMsg));
        return;
      }
      
      const streamMatch = pathname.match(/\/stream\/(movie|series)\/(tt\d+)(?::(\d+):(\d+))?\.json/);
      if (streamMatch) {
        const [, type, imdbId, season, episode] = streamMatch;
        loggingService.info(`Processing stream request for type: ${type}, imdbId: ${imdbId}, season: ${season}, episode: ${episode}`);

        try {
          const metadata = await getMetadata({
            type: type as 'movie' | 'series',
            imdbId,
            season: season ? parseInt(season) : undefined,
            episode: episode ? parseInt(episode) : undefined,
            apiKey: keys.tmdb,
          });

          if (!metadata) {
            const errorMsg = `Metadata not found for imdbId: ${imdbId}`;
            loggingService.warn(errorMsg);
            setResponse(createErrorStream("Metadata not found for this item."));
            return;
          }
          loggingService.debug(`Successfully fetched metadata for: ${metadata.title}`);

          const reviewPoints = await generateReview(metadata, keys.gemini);
          
          if (!reviewPoints || reviewPoints.length === 0) {
            const errorMsg = `Gemini returned no review points for: ${metadata.title}`;
            loggingService.warn(errorMsg);
            setResponse(createErrorStream("Could not generate review for this item."));
            return;
          }

          loggingService.info(`Successfully generated review for: ${metadata.title}`);

          const infoHash = Array.from(imdbId + (season || '') + (episode || ''))
            .reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) | 0, 0)
            .toString(16)
            .padStart(40, '0')
            .slice(0, 40);

          setResponse({
            streams: [{
              name: "Gemini Review ✨",
              title: reviewPoints.join('\n'),
              infoHash,
              behaviorHints: {
                notPlayable: true
              }
            }]
          });

        } catch (error) {
          const errorMessage = error instanceof ApiError ? error.message : "An unknown error occurred.";
          loggingService.error(`Error processing stream request for ${imdbId}: ${errorMessage}`, error);
          setResponse(createErrorStream(errorMessage));
        }
      } else {
          loggingService.warn(`Invalid stream path received: ${pathname}`);
          setResponse(createErrorStream("Invalid request format."));
      }
    };

    handleRequest();
  }, [pathname, isReady, areKeysSetup, keys]);

  if (!response) {
    // This part runs before the response is ready. Instead of showing "Loading...",
    // which can be overwritten, we just wait for the response to be set.
    return null;
  }
  
  // This is a side-effectful way to render JSON for a Stremio request.
  // It completely replaces the document content.
  document.body.innerHTML = `<pre style="word-wrap: break-word; white-space: pre-wrap; color: white;">${JSON.stringify(response, null, 2)}</pre>`;
  document.head.querySelector('title')!.textContent = "Addon Response";

  return null;
};

export default StremioHandler;