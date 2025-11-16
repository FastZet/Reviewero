
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useApiKeys } from '../hooks/useApiKeys';
import { testTmdbKey, testTvdbKey, testGeminiKey } from '../services/apiKeyService';
import { CheckIcon } from '../components/icons/CheckIcon';
import { ChevronLeftIcon } from '../components/icons/ChevronLeftIcon';
import { XCircleIcon } from '../components/icons/XCircleIcon';
import { ArrowUpTrayIcon } from '../components/icons/ArrowUpTrayIcon';
import { ArrowDownTrayIcon } from '../components/icons/ArrowDownTrayIcon';
import { InfoIcon } from '../components/icons/InfoIcon';
import { ApiKeys } from '../types';


const ConfigurePage: React.FC = () => {
  const { keys, saveKeys, isReady } = useApiKeys();
  const [tmdbKey, setTmdbKey] = useState('');
  const [tvdbKey, setTvdbKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showSuccess, setShowSuccess] = useState(false);
  const [isSavingAndTesting, setIsSavingAndTesting] = useState(false);
  const [testResults, setTestResults] = useState<{
    tmdb?: 'valid' | 'invalid';
    tvdb?: 'valid' | 'invalid';
    gemini?: 'valid' | 'invalid';
  }>({});


  useEffect(() => {
    if (isReady) {
      setTmdbKey(keys.tmdb || '');
      setTvdbKey(keys.tvdb || '');
      setGeminiKey(keys.gemini || '');
    }
  }, [isReady, keys]);
  
  const handleExportKeys = () => {
    const keysToExport: ApiKeys = {
      tmdb: tmdbKey,
      tvdb: tvdbKey,
      gemini: geminiKey,
    };
    const blob = new Blob([JSON.stringify(keysToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gemini-reviews-keys.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error("Invalid file content");
        
        const importedKeys = JSON.parse(text);
        
        // Basic validation
        if (typeof importedKeys.tmdb === 'string' && typeof importedKeys.tvdb === 'string' && typeof importedKeys.gemini === 'string') {
          setTmdbKey(importedKeys.tmdb);
          setTvdbKey(importedKeys.tvdb);
          setGeminiKey(importedKeys.gemini);
          // Clear previous test results on successful import
          setTestResults({});
        } else {
          alert('Invalid key file format.');
        }
      } catch (error) {
        console.error('Failed to parse key file:', error);
        alert('Could not read the key file. Please ensure it is a valid JSON file.');
      } finally {
          // Reset file input value to allow re-uploading the same file
          if(fileInputRef.current) {
              fileInputRef.current.value = '';
          }
      }
    };
    reader.readAsText(file);
  };


  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAndTesting(true);
    setTestResults({});
    setShowSuccess(false);

    const [tmdbValid, tvdbValid, geminiValid] = await Promise.all([
        testTmdbKey(tmdbKey.trim()),
        testTvdbKey(tvdbKey.trim()),
        testGeminiKey(geminiKey.trim())
    ]);
    
    // Fix: Explicitly type the results object to match the state type.
    const results: {
      tmdb: 'valid' | 'invalid';
      tvdb: 'valid' | 'invalid';
      gemini: 'valid' | 'invalid';
    } = {
      tmdb: tmdbValid ? 'valid' : 'invalid',
      tvdb: tvdbValid ? 'valid' : 'invalid',
      gemini: geminiValid ? 'valid' : 'invalid',
    };
    
    setTestResults(results);

    if (tmdbValid && tvdbValid && geminiValid) {
      const success = saveKeys({ 
        tmdb: tmdbKey.trim(), 
        tvdb: tvdbKey.trim(),
        gemini: geminiKey.trim() 
      });
      if (success) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    }
    
    setIsSavingAndTesting(false);
  };

  const renderStatusIcon = (status?: 'valid' | 'invalid') => {
    if (status === 'valid') {
        return <CheckIcon className="w-6 h-6 text-green-500" />;
    }
    if (status === 'invalid') {
        return <XCircleIcon className="w-6 h-6 text-red-500" />;
    }
    return null;
  };


  if (!isReady) {
    return <div className="text-center">Loading configuration...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto bg-stremio-surface p-8 rounded-lg shadow-xl animate-fade-in">
      <h1 className="text-3xl font-bold text-stremio-primary mb-6">Configuration</h1>
      <p className="text-stremio-text-secondary mb-6">
        This addon requires API keys from TMDB, TVDB, and Google Gemini.
        These keys are stored securely in your browser's local storage and are never sent anywhere else.
      </p>
      
      <div className="bg-yellow-900/50 text-yellow-300 p-4 rounded-md mb-6 border border-yellow-700">
        <div className="flex">
          <div className="flex-shrink-0">
             <InfoIcon className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="ml-3">
             <h3 className="text-sm font-medium text-yellow-200">Security Warning</h3>
             <div className="mt-2 text-sm text-yellow-300">
                <p>Exporting keys will save them in an unencrypted JSON file. Anyone with access to this file will have access to your API keys. Keep the exported file in a secure location.</p>
             </div>
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSaveAndTest} className="space-y-6">
        <div>
          <label htmlFor="tmdbKey" className="block text-sm font-medium text-stremio-text-secondary mb-2">
            TMDB API Key (v3 auth)
          </label>
          <div className="relative">
            <input
              type="password"
              id="tmdbKey"
              value={tmdbKey}
              onChange={(e) => {
                setTmdbKey(e.target.value);
                setTestResults(prev => ({ ...prev, tmdb: undefined }));
              }}
              className="w-full px-4 py-2 bg-stremio-background border border-stremio-secondary rounded-md focus:ring-stremio-primary focus:border-stremio-primary pr-10"
              placeholder="Enter your TMDB API key"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                {renderStatusIcon(testResults.tmdb)}
            </div>
          </div>
           <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer" className="text-xs text-stremio-primary hover:underline mt-1 inline-block">Where to find this?</a>
        </div>
        <div>
          <label htmlFor="tvdbKey" className="block text-sm font-medium text-stremio-text-secondary mb-2">
            TVDB API Key
          </label>
          <div className="relative">
            <input
              type="password"
              id="tvdbKey"
              value={tvdbKey}
              onChange={(e) => {
                setTvdbKey(e.target.value);
                setTestResults(prev => ({ ...prev, tvdb: undefined }));
              }}
              className="w-full px-4 py-2 bg-stremio-background border border-stremio-secondary rounded-md focus:ring-stremio-primary focus:border-stremio-primary pr-10"
              placeholder="Enter your TVDB API key"
            />
             <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                {renderStatusIcon(testResults.tvdb)}
            </div>
          </div>
           <a href="https://thetvdb.com/dashboard/account/apikeys" target="_blank" rel="noopener noreferrer" className="text-xs text-stremio-primary hover:underline mt-1 inline-block">Where to find this?</a>
        </div>
         <div>
          <label htmlFor="geminiKey" className="block text-sm font-medium text-stremio-text-secondary mb-2">
            Google Gemini API Key
          </label>
          <div className="relative">
            <input
              type="password"
              id="geminiKey"
              value={geminiKey}
              onChange={(e) => {
                setGeminiKey(e.target.value);
                setTestResults(prev => ({ ...prev, gemini: undefined }));
              }}
              className="w-full px-4 py-2 bg-stremio-background border border-stremio-secondary rounded-md focus:ring-stremio-primary focus:border-stremio-primary pr-10"
              placeholder="Enter your Gemini API key"
            />
             <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                {renderStatusIcon(testResults.gemini)}
            </div>
          </div>
           <a href="https://ai.google.dev/gemini-api/docs/api-key" target="_blank" rel="noopener noreferrer" className="text-xs text-stremio-primary hover:underline mt-1 inline-block">Where to find this?</a>
        </div>
        
        <div className="border-t border-stremio-secondary/50 pt-4 flex items-center justify-between">
            <div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" style={{ display: 'none' }} />
              <button type="button" onClick={handleImportClick} className="flex items-center text-sm px-4 py-2 text-stremio-text-secondary hover:bg-stremio-background rounded-md transition-colors">
                  <ArrowUpTrayIcon className="w-5 h-5 mr-2" /> Import Keys
              </button>
            </div>
            <div>
              <button type="button" onClick={handleExportKeys} className="flex items-center text-sm px-4 py-2 text-stremio-text-secondary hover:bg-stremio-background rounded-md transition-colors">
                  <ArrowDownTrayIcon className="w-5 h-5 mr-2" /> Export Keys
              </button>
            </div>
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-stremio-secondary/50">
            <Link to="/" className="flex items-center px-4 py-2 text-stremio-text-secondary hover:text-stremio-text-primary transition-colors rounded-md -ml-4">
                <ChevronLeftIcon className="w-5 h-5 mr-1" />
                Back
            </Link>
            <div className="flex items-center space-x-4">
                {showSuccess && (
                    <div className="flex items-center text-green-400 transition-opacity duration-300 animate-fade-in">
                        <CheckIcon className="w-5 h-5 mr-2" />
                        <span>Saved!</span>
                    </div>
                )}
                <button
                    type="submit"
                    disabled={isSavingAndTesting}
                    className="px-6 py-2 bg-stremio-primary text-white font-bold rounded-md hover:bg-stremio-secondary transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                    {isSavingAndTesting ? (
                        <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Testing & Saving...
                        </span>
                    ) : 'Save Keys'}
                </button>
            </div>
        </div>
      </form>
    </div>
  );
};

export default ConfigurePage;
