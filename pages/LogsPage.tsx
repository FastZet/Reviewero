
import React, { useState, useEffect, useRef } from 'react';
import { loggingService, LogEntry } from '../services/loggingService';

const LogLevelColors: { [key in LogEntry['level']]: string } = {
  INFO: 'text-blue-300',
  DEBUG: 'text-gray-400',
  WARN: 'text-yellow-300',
  ERROR: 'text-red-400',
};

const LogsPage: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Subscribe to the logging service
    const unsubscribe = loggingService.subscribe((currentLogs) => {
      setLogs(currentLogs);
    });

    // Unsubscribe on component unmount
    return () => {
      unsubscribe();
    };
  }, []);
  
  useEffect(() => {
    // Auto-scroll to the bottom when new logs are added
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleClearLogs = () => {
    loggingService.clearLogs();
  };

  return (
    <div className="max-w-7xl mx-auto bg-stremio-surface p-6 rounded-lg shadow-xl animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-stremio-primary">Live Addon Log</h1>
        <button
          onClick={handleClearLogs}
          className="px-4 py-2 bg-stremio-secondary text-white rounded-md hover:bg-stremio-primary transition-colors text-sm"
        >
          Clear Logs
        </button>
      </div>
      <p className="text-stremio-text-secondary mb-4">
        This page shows a live feed of the addon's actions. Use this to debug issues when using the addon in Stremio or in the Test Drive.
      </p>
      <div 
        ref={logContainerRef}
        className="bg-stremio-background p-4 rounded-md font-mono text-sm h-96 overflow-y-auto"
      >
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-stremio-text-secondary">
            <p>Waiting for addon activity...</p>
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="flex items-start break-words">
              <span className="text-gray-500 mr-2 flex-shrink-0">
                [{log.timestamp.toLocaleTimeString()}]
              </span>
              <span className={`font-bold mr-2 flex-shrink-0 ${LogLevelColors[log.level]}`}>
                [{log.level}]
              </span>
              <p className="flex-grow whitespace-pre-wrap">{log.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LogsPage;
