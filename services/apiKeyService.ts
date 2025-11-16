
import { GoogleGenAI } from "@google/genai";

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
// A CORS proxy is used to bypass browser restrictions on calling the TMDB API directly.
const CORS_PROXY = 'https://cors.eu.org/';


export const testTmdbKey = async (apiKey: string): Promise<boolean> => {
    if (!apiKey.trim()) return false;
    try {
        const targetUrl = `${TMDB_API_BASE}/configuration?api_key=${apiKey}`;
        // This proxy expects the protocol to be part of the URL it fetches.
        const fullUrl = targetUrl.startsWith('https://') ? targetUrl : `https://${targetUrl}`;
        const response = await fetch(`${CORS_PROXY}${fullUrl}`);
        return response.ok;
    } catch (error) {
        console.error("TMDB key test failed:", error);
        return false;
    }
};

export const testTvdbKey = async (apiKey: string): Promise<boolean> => {
    if (!apiKey.trim()) return false;
    try {
        // TVDB API v4 requires a POST to /login to validate a key by getting a token.
        // This endpoint correctly sets CORS headers, so no proxy is needed.
        const response = await fetch(`https://api4.thetvdb.com/v4/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ apikey: apiKey }),
        });
        return response.ok;
    } catch (error) {
        console.error("TVDB key test failed:", error);
        return false;
    }
};

export const testGeminiKey = async (apiKey: string): Promise<boolean> => {
    if (!apiKey.trim()) return false;
    try {
        const ai = new GoogleGenAI({ apiKey });
        // Make a very simple, low-cost API call to validate the key and model access
        await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "hello",
        });
        return true;
    } catch (error) {
        console.error("Gemini key test failed:", error);
        return false;
    }
};