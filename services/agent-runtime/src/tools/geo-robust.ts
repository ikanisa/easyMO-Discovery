/**
 * Robust Geo Tools
 * - geocode (using Google Maps)
 * - reverse_geocode (using Google Maps)
 * - estimate_eta (using Google Routes/Distance Matrix)
 */

import { z } from 'zod';
import type { Env } from '../types';
import { GoogleMapsClient } from '../utils/googleMaps';
import { Cache } from '../utils/cache';
import { ToolRateLimiter } from '../utils/toolRateLimit';
import { locationSchema } from '@easymo/shared/schemas';

/**
 * Geocode text to coordinates
 */
const geocodeRobustSchema = z.object({
  text: z.string(),
  user_location: locationSchema.optional(),
});

export async function geocodeRobust(
  args: z.infer<typeof geocodeRobustSchema>,
  env: Env,
  userId?: string,
  userIP?: string
): Promise<string> {
  const { text, user_location } = args;
  
  try {
    // Initialize Google Maps client
    const cache = new Cache(env.KV);
    const rateLimiter = new ToolRateLimiter(env.KV);
    const mapsClient = new GoogleMapsClient(env, cache, rateLimiter, userId, userIP);
    
    // Geocode
    const result = await mapsClient.geocode(text, user_location);
    
    return JSON.stringify({
      success: true,
      address: result.formatted_address || result.address,
      location: {
        lat: result.lat,
        lng: result.lng,
      },
      place_id: result.place_id,
      types: result.types,
      source: 'google_maps',
    });
  } catch (error: any) {
    // Fallback: Return error with helpful message
    return JSON.stringify({
      success: false,
      error: error.message || 'Geocoding failed',
      message: 'Unable to geocode location. Please try a more specific address or check your internet connection.',
    });
  }
}

/**
 * Reverse geocode coordinates to address
 */
const reverseGeocodeRobustSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

export async function reverseGeocodeRobust(
  args: z.infer<typeof reverseGeocodeRobustSchema>,
  env: Env,
  userId?: string,
  userIP?: string
): Promise<string> {
  const { lat, lng } = args;
  
  try {
    // Initialize Google Maps client
    const cache = new Cache(env.KV);
    const rateLimiter = new ToolRateLimiter(env.KV);
    const mapsClient = new GoogleMapsClient(env, cache, rateLimiter, userId, userIP);
    
    // Reverse geocode
    const result = await mapsClient.reverseGeocode(lat, lng);
    
    return JSON.stringify({
      success: true,
      address: result.formatted_address || result.address,
      place_id: result.place_id,
      types: result.types,
      source: 'google_maps',
    });
  } catch (error: any) {
    // Fallback: Return formatted coordinates
    return JSON.stringify({
      success: true,
      address: `Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      source: 'fallback',
      message: 'Exact address not available. Using coordinates.',
    });
  }
}

/**
 * Estimate ETA using Google Routes/Distance Matrix
 */
const estimateETARobustSchema = z.object({
  origin: locationSchema,
  destination: locationSchema,
  mode: z.enum(['driving', 'walking', 'transit']).default('driving'),
});

export async function estimateETARobust(
  args: z.infer<typeof estimateETARobustSchema>,
  env: Env,
  userId?: string,
  userIP?: string
): Promise<string> {
  const { origin, destination, mode } = args;
  
  try {
    // Initialize Google Maps client
    const cache = new Cache(env.KV);
    const rateLimiter = new ToolRateLimiter(env.KV);
    const mapsClient = new GoogleMapsClient(env, cache, rateLimiter, userId, userIP);
    
    // Estimate ETA
    const result = await mapsClient.estimateETA(origin, destination, mode);
    
    return JSON.stringify({
      success: true,
      distance_m: result.distance_m,
      distance_text: result.distance_text,
      duration_s: result.duration_s,
      duration_text: result.duration_text,
      eta_seconds: result.eta_seconds,
      eta_minutes: Math.ceil(result.eta_seconds / 60),
      mode,
      source: result.distance_m > 0 ? 'google_maps' : 'estimate',
    });
  } catch (error: any) {
    // Fallback: Simple distance calculation
    const distance = calculateDistance(origin, destination);
    const avgSpeed = mode === 'driving' ? 50 : mode === 'walking' ? 5 : 30; // km/h
    const etaSeconds = Math.round((distance / avgSpeed) * 3600);
    
    return JSON.stringify({
      success: true,
      distance_m: Math.round(distance * 1000),
      distance_text: `${distance.toFixed(1)}km`,
      duration_s: etaSeconds,
      duration_text: formatDuration(etaSeconds),
      eta_seconds: etaSeconds,
      eta_minutes: Math.ceil(etaSeconds / 60),
      mode,
      source: 'estimate',
      message: 'ETA estimated (Google Maps unavailable)',
    });
  }
}

// Helper: Calculate distance (Haversine)
function calculateDistance(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }): number {
  const R = 6371; // Earth's radius in km
  const dLat = (destination.lat - origin.lat) * Math.PI / 180;
  const dLng = (destination.lng - origin.lng) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(origin.lat * Math.PI / 180) *
      Math.cos(destination.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Export tool definitions
export const geoRobustTools = [
  {
    type: 'function' as const,
    function: {
      name: 'geocode',
      description: 'Geocode a location text query (e.g., "Kigali, Rwanda") to coordinates using Google Maps Geocoding API.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Location query (address or place name)' },
          user_location: {
            type: 'object',
            properties: {
              lat: { type: 'number' },
              lng: { type: 'number' },
            },
            description: 'User location for bias (optional)',
          },
        },
        required: ['text'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'reverse_geocode',
      description: 'Reverse geocode coordinates to address using Google Maps Geocoding API.',
      parameters: {
        type: 'object',
        properties: {
          lat: { type: 'number', description: 'Latitude' },
          lng: { type: 'number', description: 'Longitude' },
        },
        required: ['lat', 'lng'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'estimate_eta',
      description: 'Estimate travel time and distance between two points using Google Routes/Distance Matrix API.',
      parameters: {
        type: 'object',
        properties: {
          origin: {
            type: 'object',
            properties: {
              lat: { type: 'number' },
              lng: { type: 'number' },
            },
            required: ['lat', 'lng'],
          },
          destination: {
            type: 'object',
            properties: {
              lat: { type: 'number' },
              lng: { type: 'number' },
            },
            required: ['lat', 'lng'],
          },
          mode: { type: 'string', enum: ['driving', 'walking', 'transit'], default: 'driving' },
        },
        required: ['origin', 'destination'],
      },
    },
  },
];

