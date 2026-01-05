/**
 * Rate Limiting Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimiter } from '../utils/rateLimit';

// Mock KV namespace
const createMockKV = () => {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => store.get(key) || null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
  } as any;
};

describe('Rate Limiter', () => {
  let mockKV: any;

  beforeEach(() => {
    mockKV = createMockKV();
  });

  it('should allow requests within limit', async () => {
    const limiter = new RateLimiter(mockKV, { maxRequests: 10, windowSeconds: 60 });

    for (let i = 0; i < 10; i++) {
      const result = await limiter.checkLimit('test-key');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10 - i - 1);
    }
  });

  it('should reject requests exceeding limit', async () => {
    const limiter = new RateLimiter(mockKV, { maxRequests: 5, windowSeconds: 60 });

    // Fill up the limit
    for (let i = 0; i < 5; i++) {
      await limiter.checkLimit('test-key');
    }

    // Next request should be rejected
    const result = await limiter.checkLimit('test-key');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('should work without KV (allow all)', async () => {
    const limiter = new RateLimiter(undefined, { maxRequests: 10, windowSeconds: 60 });
    const result = await limiter.checkLimit('test-key');

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(10);
  });

  it('should generate headers', async () => {
    const limiter = new RateLimiter(mockKV, { maxRequests: 10, windowSeconds: 60 });
    const result = await limiter.checkLimit('test-key');
    const headers = limiter.getHeaders(result);

    expect(headers['X-RateLimit-Limit']).toBe('10');
    expect(headers['X-RateLimit-Remaining']).toBe('9');
    expect(headers['X-RateLimit-Reset']).toBeTruthy();
  });

  it('should check user limit', async () => {
    const limiter = new RateLimiter(mockKV, { maxRequests: 5, windowSeconds: 60 });
    const result = await limiter.checkUserLimit('user-123');

    expect(result.allowed).toBe(true);
    expect(mockKV.get).toHaveBeenCalledWith(expect.stringContaining('user:user-123'));
  });

  it('should check IP limit', async () => {
    const limiter = new RateLimiter(mockKV, { maxRequests: 5, windowSeconds: 60 });
    const result = await limiter.checkIPLimit('1.2.3.4');

    expect(result.allowed).toBe(true);
    expect(mockKV.get).toHaveBeenCalledWith(expect.stringContaining('ip:1.2.3.4'));
  });
});

