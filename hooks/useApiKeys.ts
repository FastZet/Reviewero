
import { useState, useEffect, useCallback } from 'react';
import { ApiKeys } from '../types';

const API_KEYS_STORAGE_KEY = 'stremio-gemini-reviews-apikeys';

export const useApiKeys = () => {
  const [keys, setKeys] = useState<ApiKeys>({ tmdb: '', tvdb: '', gemini: '' });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const storedKeys = localStorage.getItem(API_KEYS_STORAGE_KEY);
      if (storedKeys) {
        // Parse and merge with defaults to handle users upgrading
        const parsed = JSON.parse(storedKeys);
        setKeys(prevKeys => ({ ...prevKeys, ...parsed }));
      }
    } catch (error) {
      console.error('Failed to load API keys from localStorage', error);
    } finally {
      setIsReady(true);
    }
  }, []);

  const saveKeys = useCallback((newKeys: ApiKeys) => {
    try {
      localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(newKeys));
      setKeys(newKeys);
      return true;
    } catch (error) {
      console.error('Failed to save API keys to localStorage', error);
      return false;
    }
  }, []);
  
  const areKeysSetup = !!(keys.tmdb?.trim() && keys.tvdb?.trim() && keys.gemini?.trim());

  return { keys, saveKeys, isReady, areKeysSetup };
};