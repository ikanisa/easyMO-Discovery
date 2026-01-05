/**
 * Structured Logging Utility for Worker
 * Provides JSON-formatted logs with request/response tracking
 */

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  trace_id: string; // Renamed from request_id for consistency
  request_id?: string; // Keep for backward compatibility
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

export interface SupabaseLogConfig {
  url: string;
  serviceRoleKey: string;
  enabled: boolean;
  tableName?: string; // Default: 'request_logs'
}

export class Logger {
  private traceId: string;
  private userId?: string;
  private supabaseConfig?: SupabaseLogConfig;
  private supabaseClient?: any;

  constructor(traceId: string, userId?: string, supabaseConfig?: SupabaseLogConfig) {
    this.traceId = traceId;
    this.userId = userId;
    this.supabaseConfig = supabaseConfig;
    
    // Initialize Supabase client if config provided
    if (supabaseConfig?.enabled && supabaseConfig.url && supabaseConfig.serviceRoleKey) {
      try {
        // Dynamic import to avoid bundling issues
        import('@supabase/supabase-js').then(({ createClient }) => {
          this.supabaseClient = createClient(
            supabaseConfig.url,
            supabaseConfig.serviceRoleKey
          );
        }).catch(() => {
          // Supabase not available, continue with console logging only
        });
      } catch {
        // Ignore import errors
      }
    }
  }

  private async log(level: LogEntry['level'], message: string, metadata?: Record<string, any>, error?: Error) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      trace_id: this.traceId,
      request_id: this.traceId, // Backward compatibility
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

    // Send to Supabase if configured (fire and forget)
    if (this.supabaseConfig?.enabled && this.supabaseClient) {
      this.sendToSupabase(entry).catch(() => {
        // Ignore Supabase errors - logging should never fail the request
      });
    }

    return entry;
  }

  private async sendToSupabase(entry: LogEntry): Promise<void> {
    if (!this.supabaseClient || !this.supabaseConfig) return;

    const tableName = this.supabaseConfig.tableName || 'request_logs';
    
    try {
      await this.supabaseClient
        .from(tableName)
        .insert({
          trace_id: entry.trace_id,
          user_id: entry.user_id || null,
          level: entry.level,
          message: entry.message,
          agent_type: entry.agent_type || null,
          tool_name: entry.tool_name || null,
          duration_ms: entry.duration_ms || null,
          error: entry.error || null,
          metadata: entry.metadata || {},
          created_at: entry.timestamp,
        });
    } catch (err) {
      // Silently fail - don't break request flow
      console.debug('Failed to send log to Supabase:', err);
    }
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
 * Generate a unique trace ID (replaces request_id for consistency)
 */
export function generateTraceId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate a unique request ID (backward compatibility)
 * @deprecated Use generateTraceId() instead
 */
export function generateRequestId(): string {
  return generateTraceId();
}

