/**
 * Error Handling Utility for Worker
 * Provides error codes, retry logic, and error tracking
 */

export enum ErrorCode {
  // Client errors (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Server errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  OPENAI_ERROR = 'OPENAI_ERROR',
  SUPABASE_ERROR = 'SUPABASE_ERROR',
  TOOL_ERROR = 'TOOL_ERROR',
  TIMEOUT = 'TIMEOUT',
}

export class WorkerError extends Error {
  code: ErrorCode;
  statusCode: number;
  retryable: boolean;
  metadata?: Record<string, any>;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 500,
    retryable: boolean = false,
    metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'WorkerError';
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.metadata = metadata;
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      ...(this.metadata && { metadata: this.metadata }),
    };
  }
}

/**
 * Create error responses with proper format
 */
export function createErrorResponse(
  error: Error | WorkerError,
  traceId?: string
): { status: number; body: any; headers: Record<string, string> } {
  let workerError: WorkerError;

  if (error instanceof WorkerError) {
    workerError = error;
  } else {
    // Convert generic error to WorkerError
    workerError = new WorkerError(
      error.message || 'Internal server error',
      ErrorCode.INTERNAL_ERROR,
      500,
      false
    );
  }

  const body = {
    error: workerError.message,
    code: workerError.code,
    ...(traceId && { trace_id: traceId, request_id: traceId }), // Backward compatibility
    ...(workerError.metadata && { metadata: workerError.metadata }),
  };

  return {
    status: workerError.statusCode,
    body,
    headers: {
      'Content-Type': 'application/json',
    },
  };
}

/**
 * Retry logic for transient failures
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    retryable?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    retryable = (error: Error) => {
      // Default: retry on network errors or 5xx errors
      if (error instanceof WorkerError) {
        return error.retryable;
      }
      return true; // Retry generic errors by default
    },
  } = options;

  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries || !retryable(error as Error)) {
        throw error;
      }

      // Exponential backoff
      const delay = delayMs * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Timeout wrapper for async functions
 */
export async function withTimeout<T>(
  fn: Promise<T>,
  timeoutMs: number,
  timeoutError?: string
): Promise<T> {
  return Promise.race([
    fn,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new WorkerError(
          timeoutError || 'Request timeout',
          ErrorCode.TIMEOUT,
          504,
          true
        ));
      }, timeoutMs);
    }),
  ]);
}

/**
 * Wrap OpenAI API calls with error handling
 */
export function wrapOpenAIError(error: any): WorkerError {
  if (error.status === 429) {
    return new WorkerError(
      'OpenAI rate limit exceeded',
      ErrorCode.RATE_LIMIT_EXCEEDED,
      429,
      true,
      { retryAfter: error.headers?.['retry-after'] }
    );
  }

  if (error.status === 401) {
    return new WorkerError(
      'OpenAI authentication failed',
      ErrorCode.UNAUTHORIZED,
      401,
      false
    );
  }

  if (error.status >= 500) {
    return new WorkerError(
      error.message || 'OpenAI service error',
      ErrorCode.OPENAI_ERROR,
      error.status || 502,
      true
    );
  }

  return new WorkerError(
    error.message || 'OpenAI API error',
    ErrorCode.OPENAI_ERROR,
    error.status || 500,
    false
  );
}

/**
 * Wrap Supabase errors
 */
export function wrapSupabaseError(error: any): WorkerError {
  return new WorkerError(
    error.message || 'Supabase error',
    ErrorCode.SUPABASE_ERROR,
    502,
    true // Supabase errors are usually retryable
  );
}

