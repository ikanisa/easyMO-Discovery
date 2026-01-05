/**
 * Rate Limiting Utility for Worker
 * Uses Cloudflare KV for distributed rate limiting
 */

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  retryAfter?: number; // Seconds until reset
}

export class RateLimiter {
  private kv?: KVNamespace;
  private defaultConfig: RateLimitConfig;

  constructor(kv?: KVNamespace, defaultConfig?: RateLimitConfig) {
    this.kv = kv;
    this.defaultConfig = defaultConfig || {
      maxRequests: 100, // Default: 100 requests
      windowSeconds: 60, // Default: per minute
    };
  }

  /**
   * Check rate limit for a key (user_id or IP)
   */
  async checkLimit(key: string, config?: RateLimitConfig): Promise<RateLimitResult> {
    if (!this.kv) {
      // No KV configured - allow all requests
      return {
        allowed: true,
        limit: config?.maxRequests || this.defaultConfig.maxRequests,
        remaining: config?.maxRequests || this.defaultConfig.maxRequests,
        reset: Date.now() + (config?.windowSeconds || this.defaultConfig.windowSeconds) * 1000,
      };
    }

    const limitConfig = config || this.defaultConfig;
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - (now % limitConfig.windowSeconds);
    const rateLimitKey = `ratelimit:${key}:${windowStart}`;

    try {
      // Get current count
      const countStr = await this.kv.get(rateLimitKey);
      const count = countStr ? parseInt(countStr, 10) : 0;

      if (count >= limitConfig.maxRequests) {
        // Rate limit exceeded
        const reset = (windowStart + limitConfig.windowSeconds) * 1000;
        const retryAfter = Math.ceil((reset - Date.now()) / 1000);

        return {
          allowed: false,
          limit: limitConfig.maxRequests,
          remaining: 0,
          reset,
          retryAfter,
        };
      }

      // Increment count
      const newCount = count + 1;
      await this.kv.put(rateLimitKey, newCount.toString(), {
        expirationTtl: limitConfig.windowSeconds + 1, // Add 1 second buffer
      });

      const reset = (windowStart + limitConfig.windowSeconds) * 1000;

      return {
        allowed: true,
        limit: limitConfig.maxRequests,
        remaining: limitConfig.maxRequests - newCount,
        reset,
      };
    } catch (error) {
      // KV error - allow request (fail open)
      console.error('Rate limit KV error:', error);
      return {
        allowed: true,
        limit: limitConfig.maxRequests,
        remaining: limitConfig.maxRequests,
        reset: Date.now() + limitConfig.windowSeconds * 1000,
      };
    }
  }

  /**
   * Check rate limit for user (preferred)
   */
  async checkUserLimit(userId: string, config?: RateLimitConfig): Promise<RateLimitResult> {
    return this.checkLimit(`user:${userId}`, config);
  }

  /**
   * Check rate limit for IP (fallback for anonymous users)
   */
  async checkIPLimit(ip: string, config?: RateLimitConfig): Promise<RateLimitResult> {
    return this.checkLimit(`ip:${ip}`, config);
  }

  /**
   * Get rate limit headers for response
   */
  getHeaders(result: RateLimitResult): Record<string, string> {
    return {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(result.reset / 1000).toString(),
      ...(result.retryAfter && { 'Retry-After': result.retryAfter.toString() }),
    };
  }
}

