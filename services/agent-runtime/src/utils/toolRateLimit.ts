/**
 * Tool-specific rate limiting for expensive operations (Google Maps, Gemini)
 * Separate from general API rate limiting
 */

import { RateLimiter, type RateLimitConfig } from './rateLimit';

export interface ToolRateLimitConfig {
  googleMaps?: RateLimitConfig; // Default: 100/hour
  gemini?: RateLimitConfig; // Default: 50/hour
}

const DEFAULT_TOOL_LIMITS: ToolRateLimitConfig = {
  googleMaps: {
    maxRequests: 100,
    windowSeconds: 3600, // 1 hour
  },
  gemini: {
    maxRequests: 50,
    windowSeconds: 3600, // 1 hour
  },
};

export class ToolRateLimiter {
  private rateLimiter: RateLimiter;
  private config: ToolRateLimitConfig;

  constructor(kv?: KVNamespace, config?: ToolRateLimitConfig) {
    this.rateLimiter = new RateLimiter(kv);
    this.config = { ...DEFAULT_TOOL_LIMITS, ...config };
  }

  /**
   * Check rate limit for Google Maps API calls
   */
  async checkGoogleMapsLimit(userId?: string, ip?: string): Promise<{ allowed: boolean; retryAfter?: number }> {
    const config = this.config.googleMaps || DEFAULT_TOOL_LIMITS.googleMaps!;
    const key = userId ? `user:${userId}` : `ip:${ip || 'unknown'}`;
    
    const result = await this.rateLimiter.checkLimit(`tool:googlemaps:${key}`, config);
    
    return {
      allowed: result.allowed,
      retryAfter: result.retryAfter,
    };
  }

  /**
   * Check rate limit for Gemini API calls
   */
  async checkGeminiLimit(userId?: string, ip?: string): Promise<{ allowed: boolean; retryAfter?: number }> {
    const config = this.config.gemini || DEFAULT_TOOL_LIMITS.gemini!;
    const key = userId ? `user:${userId}` : `ip:${ip || 'unknown'}`;
    
    const result = await this.rateLimiter.checkLimit(`tool:gemini:${key}`, config);
    
    return {
      allowed: result.allowed,
      retryAfter: result.retryAfter,
    };
  }
}

