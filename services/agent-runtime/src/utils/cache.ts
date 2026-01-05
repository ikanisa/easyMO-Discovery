/**
 * Caching utility for expensive API calls (Google Maps, Gemini)
 * Uses Cloudflare KV for distributed caching
 */

export interface CacheOptions {
  ttl?: number; // Time to live in seconds (default: 3600 = 1 hour)
}

export class Cache {
  private kv?: KVNamespace;

  constructor(kv?: KVNamespace) {
    this.kv = kv;
  }

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.kv) {
      return null; // No cache available
    }

    try {
      const value = await this.kv.get(key, 'json');
      return value as T | null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached value
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    if (!this.kv) {
      return; // No cache available
    }

    try {
      const ttl = options?.ttl || 3600; // Default 1 hour
      await this.kv.put(key, JSON.stringify(value), {
        expirationTtl: ttl,
      });
    } catch (error) {
      console.error('Cache set error:', error);
      // Fail silently - caching is non-critical
    }
  }

  /**
   * Generate cache key for geocode query
   */
  static geocodeKey(query: string, userLocation?: { lat: number; lng: number }): string {
    const locationPart = userLocation 
      ? `:${Math.round(userLocation.lat * 1000)}:${Math.round(userLocation.lng * 1000)}`
      : '';
    return `cache:geocode:${encodeURIComponent(query.toLowerCase().trim())}${locationPart}`;
  }

  /**
   * Generate cache key for reverse geocode
   */
  static reverseGeocodeKey(lat: number, lng: number): string {
    // Round to ~100m precision for cache key
    const latRounded = Math.round(lat * 1000) / 1000;
    const lngRounded = Math.round(lng * 1000) / 1000;
    return `cache:reverse_geocode:${latRounded}:${lngRounded}`;
  }

  /**
   * Generate cache key for ETA calculation
   */
  static etaKey(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }, mode: string): string {
    // Round to ~100m precision
    const oLat = Math.round(origin.lat * 1000) / 1000;
    const oLng = Math.round(origin.lng * 1000) / 1000;
    const dLat = Math.round(destination.lat * 1000) / 1000;
    const dLng = Math.round(destination.lng * 1000) / 1000;
    return `cache:eta:${oLat}:${oLng}:${dLat}:${dLng}:${mode}`;
  }

  /**
   * Delete cached value
   */
  async delete(key: string): Promise<void> {
    if (!this.kv) {
      return;
    }

    try {
      await this.kv.delete(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }
}

