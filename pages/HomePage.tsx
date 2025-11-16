
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRightIcon } from '../components/icons/ChevronRightIcon';
import { InfoIcon } from '../components/icons/InfoIcon';
import TestGround from '../components/TestGround';
import { ClipboardIcon } from '../components/icons/ClipboardIcon';
import { CheckIcon } from '../components/icons/CheckIcon';

const HomePage: React.FC = () => {
    const addonUrl = `${window.location.origin}/manifest.json`;
    const installUrl = `stremio://installaddon?url=${encodeURIComponent(addonUrl)}`;
    const [isCopied, setIsCopied] = useState(false);

  const exampleReview = [
    "🎬 Plot: Gripping & unpredictable",
    "🎥 Cinematography: Visually stunning",
    "🎭 Acting: Powerful performances",
    "🎵 Score: Evocative & memorable",
    "🏃 Pacing: Perfectly balanced rhythm",
    "🌍 World-building: Rich & immersive",
    "🤔 Themes: Thought-provoking ideas",
    "👍 Verdict: A must-watch masterpiece"
  ];
  
  const handleCopy = () => {
    navigator.clipboard.writeText(installUrl).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-stremio-primary mb-2">Welcome to Gemini Spoiler-Free Reviews</h1>
        <p className="text-lg text-stremio-text-secondary">Your AI-powered companion for quick, spoiler-free insights on movies and shows.</p>
      </div>

      <div className="bg-stremio-surface p-6 rounded-lg shadow-xl">
        <h2 className="text-2xl font-semibold mb-4 flex items-center"><InfoIcon className="w-6 h-6 mr-2 text-stremio-primary" /> How It Works</h2>
        <ol className="list-decimal list-inside space-y-2 text-stremio-text-secondary">
          <li><strong>Install the Addon:</strong> Click the install button below and add it to your Stremio.</li>
          <li><strong>Configure Keys:</strong> Go to the 'Configure' page and enter your TMDB and TVDB API keys.</li>
          <li><strong>Select a Movie/Show:</strong> Browse Stremio as usual.</li>
          <li><strong>Find the Review Stream:</strong> Click on any movie or episode, and you'll see a "Gemini Review ✨" stream result.</li>
          <li><strong>Read the Review:</strong> The review is presented as 8 concise bullet points in the stream's title. No spoilers, guaranteed!</li>
        </ol>
      </div>
      
      <div className="bg-stremio-surface p-6 rounded-lg shadow-xl">
        <h2 className="text-2xl font-semibold mb-4">Example Review</h2>
        <div className="bg-stremio-background p-4 rounded-md">
            <p className="font-bold text-lg text-stremio-primary mb-3">Gemini Review ✨</p>
            <div className="space-y-1">
            {exampleReview.map((point, index) => (
                <p key={index} className="text-stremio-text-primary">{point}</p>
            ))}
            </div>
        </div>
      </div>

      <TestGround />

      <div className="text-center space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a 
              href={installUrl}
              className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 bg-stremio-primary text-white font-bold rounded-lg shadow-lg hover:bg-stremio-secondary transition-transform transform hover:scale-105"
            >
              Install Addon
              <ChevronRightIcon className="w-5 h-5 ml-2" />
            </a>
            <button 
              onClick={handleCopy}
              className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 bg-stremio-surface text-stremio-text-primary font-bold rounded-lg shadow-lg hover:bg-stremio-secondary transition-colors"
            >
              {isCopied ? (
                <>
                  <CheckIcon className="w-5 h-5 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <ClipboardIcon className="w-5 h-5 mr-2" />
                  Copy Install URL
                </>
              )}
            </button>
        </div>
        <p className="text-stremio-text-secondary text-sm">You need Stremio desktop app to install.</p>
      </div>
    </div>
  );
};

export default HomePage;
