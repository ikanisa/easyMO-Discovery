/**
 * Google Maps API client (server-side only)
 * Handles Geocoding, Places, Routes, Distance Matrix
 */

import type { Env } from '../types';
import { Cache } from './cache';
import { ToolRateLimiter } from './toolRateLimit';

export interface GeocodeResult {
  address: string;
  lat: number;
  lng: number;
  place_id?: string;
  formatted_address?: string;
  types?: string[];
}

export interface ReverseGeocodeResult {
  address: string;
  formatted_address?: string;
  place_id?: string;
  types?: string[];
}

export interface ETAResult {
  distance_m: number;
  distance_text: string;
  duration_s: number;
  duration_text: string;
  eta_seconds: number;
}

export class GoogleMapsClient {
  private apiKey: string;
  private cache: Cache;
  private rateLimiter: ToolRateLimiter;
  private userId?: string;
  private userIP?: string;

  constructor(env: Env, cache: Cache, rateLimiter: ToolRateLimiter, userId?: string, userIP?: string) {
    if (!env.GOOGLE_MAPS_API_KEY) {
      throw new Error('GOOGLE_MAPS_API_KEY not configured');
    }
    this.apiKey = env.GOOGLE_MAPS_API_KEY;
    this.cache = cache;
    this.rateLimiter = rateLimiter;
    this.userId = userId;
    this.userIP = userIP;
  }

  /**
   * Geocode a text query to coordinates
   */
  async geocode(query: string, userLocation?: { lat: number; lng: number }): Promise<GeocodeResult> {
    // Check cache
    const cacheKey = Cache.geocodeKey(query, userLocation);
    const cached = await this.cache.get<GeocodeResult>(cacheKey);
    if (cached) {
      return cached;
    }

    // Check rate limit
    const rateLimit = await this.rateLimiter.checkGoogleMapsLimit(this.userId, this.userIP);
    if (!rateLimit.allowed) {
      throw new Error(`Google Maps rate limit exceeded. Retry after ${rateLimit.retryAfter} seconds.`);
    }

    try {
      // Build request URL
      let url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${this.apiKey}`;
      
      // Add location bias if user location provided
      if (userLocation) {
        url += `&location=${userLocation.lat},${userLocation.lng}&radius=50000`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google Maps API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0];
        const geocodeResult: GeocodeResult = {
          address: result.formatted_address || query,
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          place_id: result.place_id,
          formatted_address: result.formatted_address,
          types: result.types,
        };

        // Cache result (1 hour TTL)
        await this.cache.set(cacheKey, geocodeResult, { ttl: 3600 });

        return geocodeResult;
      }

      // Fallback: Try Places API if Geocoding fails
      return await this.geocodePlaces(query, userLocation);
    } catch (error: any) {
      console.error('Google Maps geocode error:', error);
      throw new Error(`Geocoding failed: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Fallback: Use Places API for geocoding
   */
  private async geocodePlaces(query: string, userLocation?: { lat: number; lng: number }): Promise<GeocodeResult> {
    let url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=formatted_address,geometry,place_id&key=${this.apiKey}`;
    
    if (userLocation) {
      url += `&locationbias=circle:50000@${userLocation.lat},${userLocation.lng}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status === 'OK' && data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      return {
        address: candidate.formatted_address || query,
        lat: candidate.geometry.location.lat,
        lng: candidate.geometry.location.lng,
        place_id: candidate.place_id,
        formatted_address: candidate.formatted_address,
      };
    }

    throw new Error(`No results found for: ${query}`);
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
    // Check cache
    const cacheKey = Cache.reverseGeocodeKey(lat, lng);
    const cached = await this.cache.get<ReverseGeocodeResult>(cacheKey);
    if (cached) {
      return cached;
    }

    // Check rate limit
    const rateLimit = await this.rateLimiter.checkGoogleMapsLimit(this.userId, this.userIP);
    if (!rateLimit.allowed) {
      throw new Error(`Google Maps rate limit exceeded. Retry after ${rateLimit.retryAfter} seconds.`);
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Google Maps API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0];
        const reverseResult: ReverseGeocodeResult = {
          address: result.formatted_address,
          formatted_address: result.formatted_address,
          place_id: result.place_id,
          types: result.types,
        };

        // Cache result (1 hour TTL)
        await this.cache.set(cacheKey, reverseResult, { ttl: 3600 });

        return reverseResult;
      }

      throw new Error(`No address found for coordinates: ${lat}, ${lng}`);
    } catch (error: any) {
      console.error('Google Maps reverse geocode error:', error);
      throw new Error(`Reverse geocoding failed: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Estimate ETA using Distance Matrix API
   */
  async estimateETA(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    mode: 'driving' | 'walking' | 'transit' = 'driving'
  ): Promise<ETAResult> {
    // Check cache
    const cacheKey = Cache.etaKey(origin, destination, mode);
    const cached = await this.cache.get<ETAResult>(cacheKey);
    if (cached) {
      return cached;
    }

    // Check rate limit
    const rateLimit = await this.rateLimiter.checkGoogleMapsLimit(this.userId, this.userIP);
    if (!rateLimit.allowed) {
      // Fallback to simple calculation
      return this.estimateETAFallback(origin, destination, mode);
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${destination.lat},${destination.lng}&mode=${mode}&key=${this.apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Google Maps API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status === 'OK' && data.rows?.[0]?.elements?.[0]?.status === 'OK') {
        const element = data.rows[0].elements[0];
        const etaResult: ETAResult = {
          distance_m: element.distance.value,
          distance_text: element.distance.text,
          duration_s: element.duration.value,
          duration_text: element.duration.text,
          eta_seconds: element.duration.value,
        };

        // Cache result (30 minutes TTL - ETAs change more frequently)
        await this.cache.set(cacheKey, etaResult, { ttl: 1800 });

        return etaResult;
      }

      // Fallback if API returns no route
      return this.estimateETAFallback(origin, destination, mode);
    } catch (error: any) {
      console.error('Google Maps ETA error:', error);
      // Fallback to simple calculation
      return this.estimateETAFallback(origin, destination, mode);
    }
  }

  /**
   * Fallback ETA calculation using Haversine distance
   */
  private estimateETAFallback(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    mode: 'driving' | 'walking' | 'transit'
  ): ETAResult {
    // Haversine distance calculation
    const R = 6371000; // Earth's radius in meters
    const dLat = (destination.lat - origin.lat) * Math.PI / 180;
    const dLng = (destination.lng - origin.lng) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(origin.lat * Math.PI / 180) *
        Math.cos(destination.lat * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceM = R * c;

    // Average speeds (m/s)
    const speeds: Record<string, number> = {
      driving: 13.89, // ~50 km/h
      walking: 1.39, // ~5 km/h
      transit: 8.33, // ~30 km/h
    };

    const speed = speeds[mode] || speeds.driving;
    const durationS = Math.round(distanceM / speed);

    return {
      distance_m: Math.round(distanceM),
      distance_text: distanceM < 1000 ? `${Math.round(distanceM)}m` : `${(distanceM / 1000).toFixed(1)}km`,
      duration_s: durationS,
      duration_text: this.formatDuration(durationS),
      eta_seconds: durationS,
    };
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
}

