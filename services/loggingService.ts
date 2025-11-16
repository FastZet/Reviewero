
type LogLevel = 'INFO' | 'DEBUG' | 'WARN' | 'ERROR';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: any;
}

type LogListener = (logs: LogEntry[]) => void;

class LoggingService {
  private logs: LogEntry[] = [];
  private listeners: Set<LogListener> = new Set();
  private maxLogSize = 200; // Keep the last 200 log entries

  private log(level: LogLevel, message: string, context?: any) {
    const newEntry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
    };

    this.logs.push(newEntry);

    // Prune old logs to prevent memory issues
    if (this.logs.length > this.maxLogSize) {
      this.logs = this.logs.slice(this.logs.length - this.maxLogSize);
    }
    
    // Log to console for development
    switch(level) {
        case 'INFO':
            console.log(message, context || '');
            break;
        case 'DEBUG':
            console.debug(message, context || '');
            break;
        case 'WARN':
            console.warn(message, context || '');
            break;
        case 'ERROR':
            console.error(message, context || '');
            break;
    }

    this.notifyListeners();
  }

  public info(message: string, context?: any) {
    this.log('INFO', message, context);
  }
  
  public debug(message: string, context?: any) {
    this.log('DEBUG', message, context);
  }

  public warn(message: string, context?: any) {
    this.log('WARN', message, context);
  }

  public error(message: string, context?: any) {
    this.log('ERROR', message, context);
  }
  
  public getLogs(): LogEntry[] {
      return [...this.logs];
  }
  
  public clearLogs() {
      this.logs = [];
      this.notifyListeners();
  }

  public subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    // Immediately provide the current logs to the new listener
    listener(this.getLogs());
    
    // Return an unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }
  
  private notifyListeners() {
    const currentLogs = this.getLogs();
    for (const listener of this.listeners) {
      listener(currentLogs);
    }
  }
}

// Export a singleton instance
export const loggingService = new LoggingService();
