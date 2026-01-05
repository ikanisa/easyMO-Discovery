/**
 * Request Tracing Utility for Worker
 * Tracks request flow, performance metrics, and dependencies
 */

export interface TraceSpan {
  name: string;
  start: number;
  end?: number;
  duration?: number;
  metadata?: Record<string, any>;
  error?: Error;
}

export interface TraceContext {
  requestId: string;
  userId?: string;
  agentType?: string;
  spans: TraceSpan[];
  metadata?: Record<string, any>;
}

export class Tracer {
  private context: TraceContext;

  constructor(requestId: string, userId?: string, agentType?: string) {
    this.context = {
      requestId,
      userId,
      agentType,
      spans: [],
    };
  }

  /**
   * Start a new trace span
   */
  startSpan(name: string, metadata?: Record<string, any>): TraceSpan {
    const span: TraceSpan = {
      name,
      start: Date.now(),
      metadata,
    };
    this.context.spans.push(span);
    return span;
  }

  /**
   * End a trace span
   */
  endSpan(span: TraceSpan, error?: Error, metadata?: Record<string, any>): void {
    span.end = Date.now();
    span.duration = span.end - span.start;
    if (metadata) {
      span.metadata = { ...span.metadata, ...metadata };
    }
    if (error) {
      span.error = error;
    }
  }

  /**
   * Execute a function within a trace span
   */
  async trace<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const span = this.startSpan(name, metadata);
    try {
      const result = await fn();
      this.endSpan(span, undefined, metadata);
      return result;
    } catch (error) {
      this.endSpan(span, error as Error, metadata);
      throw error;
    }
  }

  /**
   * Get trace summary
   */
  getSummary(): TraceContext {
    return {
      ...this.context,
      spans: this.context.spans.map(span => ({
        ...span,
        duration: span.duration || (span.end ? span.end - span.start : undefined),
      })),
    };
  }

  /**
   * Get total duration
   */
  getTotalDuration(): number {
    if (this.context.spans.length === 0) return 0;
    const firstSpan = this.context.spans[0];
    const lastSpan = this.context.spans[this.context.spans.length - 1];
    return (lastSpan.end || Date.now()) - firstSpan.start;
  }

  /**
   * Add metadata to trace context
   */
  setMetadata(key: string, value: any): void {
    if (!this.context.metadata) {
      this.context.metadata = {};
    }
    this.context.metadata[key] = value;
  }
}

