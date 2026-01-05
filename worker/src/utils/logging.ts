/**
 * Structured Logging Utility for Worker
 * Provides JSON-formatted logs with request/response tracking
 */

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  request_id?: string;
  user_id?: string;
  agent_type?: string;
  tool_name?: string;
  duration_ms?: number;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  metadata?: Record<string, any>;
}

export class Logger {
  private requestId: string;
  private userId?: string;

  constructor(requestId: string, userId?: string) {
    this.requestId = requestId;
    this.userId = userId;
  }

  private log(level: LogEntry['level'], message: string, metadata?: Record<string, any>, error?: Error) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      request_id: this.requestId,
      ...(this.userId && { user_id: this.userId }),
      ...(metadata || {}),
      ...(error && {
        error: {
          message: error.message,
          stack: error.stack,
          ...(error as any).code && { code: (error as any).code },
        },
      }),
    };

    // In Cloudflare Workers, console.log outputs to logs
    // JSON format for structured logging
    const logMessage = JSON.stringify(entry);
    
    switch (level) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'debug':
        console.debug(logMessage);
        break;
      default:
        console.log(logMessage);
    }

    return entry;
  }

  info(message: string, metadata?: Record<string, any>) {
    return this.log('info', message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>) {
    return this.log('warn', message, metadata);
  }

  error(message: string, error?: Error, metadata?: Record<string, any>) {
    return this.log('error', message, metadata, error);
  }

  debug(message: string, metadata?: Record<string, any>) {
    return this.log('debug', message, metadata);
  }

  request(method: string, path: string, agentType?: string, metadata?: Record<string, any>) {
    return this.info('Request received', {
      ...metadata,
      method,
      path,
      agent_type: agentType,
    });
  }

  response(status: number, durationMs: number, metadata?: Record<string, any>) {
    return this.info('Response sent', {
      ...metadata,
      status,
      duration_ms: durationMs,
    });
  }

  toolCall(toolName: string, args: any, durationMs?: number, metadata?: Record<string, any>) {
    return this.info('Tool called', {
      ...metadata,
      tool_name: toolName,
      tool_args: args,
      ...(durationMs && { duration_ms: durationMs }),
    });
  }

  toolResult(toolName: string, success: boolean, durationMs?: number, error?: Error, metadata?: Record<string, any>) {
    if (success) {
      return this.info('Tool executed successfully', {
        ...metadata,
        tool_name: toolName,
        ...(durationMs && { duration_ms: durationMs }),
      });
    } else {
      return this.error('Tool execution failed', error, {
        ...metadata,
        tool_name: toolName,
        ...(durationMs && { duration_ms: durationMs }),
      });
    }
  }
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

