
/**
 * Structured Logging Service for PWA
 * 
 * Provides structured logging with levels, context, and optional remote logging
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };
  user_id?: string;
  session_id?: string;
  url?: string;
  user_agent?: string;
}

class Logger {
  private sessionId: string;
  private userId?: string;
  private logEndpoint?: string;
  private logBuffer: LogEntry[] = [];
  private flushInterval: number | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.logEndpoint = import.meta.env.VITE_LOG_ENDPOINT;
    
    // Flush logs periodically (every 5 seconds)
    if (this.logEndpoint) {
      this.flushInterval = window.setInterval(() => {
        this.flush();
      }, 5000);
    }

    // Flush logs on page unload
    window.addEventListener('beforeunload', () => {
      this.flush();
    });
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      ...(error && {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      }),
      ...(this.userId && { user_id: this.userId }),
      session_id: this.sessionId,
      url: window.location.href,
      user_agent: navigator.userAgent,
    };
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error) {
    const entry = this.createLogEntry(level, message, context, error);

    // Console output (always)
    const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : level === 'debug' ? 'debug' : 'log';
    console[consoleMethod](`[${level.toUpperCase()}] ${message}`, context || '', error || '');

    // Add to buffer for remote logging
    if (this.logEndpoint) {
      this.logBuffer.push(entry);
      
      // Flush immediately for errors
      if (level === 'error') {
        this.flush();
      }
    }
  }

  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    this.log('error', message, context, error);
  }

  private async flush() {
    if (this.logBuffer.length === 0 || !this.logEndpoint) {
      return;
    }

    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];

    try {
      // Use sendBeacon for reliable delivery
      const blob = new Blob([JSON.stringify({ logs: logsToSend })], {
        type: 'application/json',
      });
      
      const sent = navigator.sendBeacon(this.logEndpoint, blob);
      
      if (!sent) {
        // Fallback to fetch
        await fetch(this.logEndpoint, {
          method: 'POST',
          body: JSON.stringify({ logs: logsToSend }),
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
        });
      }
    } catch (error) {
      // Re-add logs to buffer if send failed
      this.logBuffer.unshift(...logsToSend);
      console.error('Failed to send logs:', error);
    }
  }

  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }
}

// Singleton instance
let loggerInstance: Logger | null = null;

export const LoggingService = {
  init: () => {
    if (!loggerInstance) {
      loggerInstance = new Logger();
    }
    return loggerInstance;
  },

  getInstance: () => {
    if (!loggerInstance) {
      loggerInstance = new Logger();
    }
    return loggerInstance;
  },

  setUserId: (userId: string) => {
    LoggingService.getInstance().setUserId(userId);
  },

  debug: (message: string, context?: Record<string, any>) => {
    LoggingService.getInstance().debug(message, context);
  },

  info: (message: string, context?: Record<string, any>) => {
    LoggingService.getInstance().info(message, context);
  },

  warn: (message: string, context?: Record<string, any>) => {
    LoggingService.getInstance().warn(message, context);
  },

  error: (message: string, error?: Error, context?: Record<string, any>) => {
    LoggingService.getInstance().error(message, error, context);
  },
};

