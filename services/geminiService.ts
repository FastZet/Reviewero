
import { GoogleGenAI } from "@google/genai";
import { MediaMetadata, ApiError, InvalidApiKeyError, RateLimitError, GeminiSafetyError } from "../types";
import { loggingService } from "./loggingService";

/**
 * Extracts a JSON array from a string that might contain other text or markdown.
 * @param text The text response from the AI model.
 * @returns A parsed array or null if no valid array is found.
 */
const extractJsonArray = (text: string): any[] | null => {
  const startIndex = text.indexOf('[');
  const endIndex = text.lastIndexOf(']');
  
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    loggingService.warn('Could not find start/end brackets for JSON array in Gemini response.', { text });
    return null;
  }
  
  const jsonString = text.substring(startIndex, endIndex + 1);
  
  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    loggingService.warn('Parsed JSON from Gemini response was not an array.', { jsonString });
    return null;
  } catch (e) {
    loggingService.error("Failed to parse extracted JSON string from Gemini response.", { jsonString, error: e });
    return null;
  }
};

export const generateReview = async (metadata: MediaMetadata, geminiApiKey: string): Promise<string[]> => {
  if (!geminiApiKey) {
    throw new InvalidApiKeyError("Gemini (key not provided)");
  }
  
  const ai = new GoogleGenAI({ apiKey: geminiApiKey });

  const isSeries = metadata.type === 'series';
  const contentTitle = isSeries 
    ? `${metadata.title} S${metadata.season}E${metadata.episode}`
    : `${metadata.title} (${metadata.year})`;
  
  loggingService.info(`Generating review for: ${contentTitle}`);

  const details = isSeries 
    ? `Series Title: ${metadata.title}
Season: ${metadata.season}
Episode: ${metadata.episode}
Episode Title: ${metadata.episodeTitle}`
    : `Movie Title: ${metadata.title}
Year: ${metadata.year}`;

  const prompt = `You are a movie and TV show critic who writes extremely concise, spoiler-free reviews.
Your task is to generate a review for the following content, using up-to-date information from Google Search to inform your review.
${details}
Overview: ${metadata.overview}

Your review MUST follow these rules strictly:
1. The review must consist of exactly 8 bullet points.
2. Each bullet point MUST be a maximum of 30 characters long.
3. Each bullet point MUST start with a relevant emoji.
4. The bullet points should cover different aspects like: Plot, Cinematography, Acting, Score/Sound, Pacing, World-building, Themes, and a final Verdict.
5. The review MUST be completely spoiler-free. Do not reveal any plot twists or major events.
6. Your final output MUST be only the raw JSON array of 8 strings. Do not include any other text, explanation, or markdown formatting like \`\`\`json.
`;

  try {
    loggingService.debug(`Sending prompt to Gemini for: ${contentTitle}`);
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{googleSearch: {}}],
        temperature: 0.7
      },
    });

    if (!response.candidates || response.candidates.length === 0) {
        loggingService.error(`Gemini response blocked for safety reasons for: ${contentTitle}`, { response });
        throw new GeminiSafetyError("Review generation was blocked. The content might be sensitive.");
    }
    
    loggingService.debug(`Received Gemini response for: ${contentTitle}`);
    const rawText = response.text.trim();
    const reviewPoints = extractJsonArray(rawText);

    if (reviewPoints && reviewPoints.every(p => typeof p === 'string')) {
      return reviewPoints as string[];
    } else {
      loggingService.error("Invalid JSON or structure received from Gemini:", { rawText });
      throw new ApiError("Gemini did not return a valid array of strings.");
    }

  } catch (error: any) {
    const errorMessage = (error.toString() || "").toLowerCase();
    loggingService.error(`Error generating review with Gemini for ${contentTitle}: ${errorMessage}`, error);

    if (errorMessage.includes('api key not valid')) {
        throw new InvalidApiKeyError('Gemini');
    }
    if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
        throw new RateLimitError('Gemini');
    }
    if (error instanceof ApiError) { // Includes GeminiSafetyError
        throw error;
    }
    
    throw new ApiError("An unexpected error occurred while generating the review.");
  }
};
