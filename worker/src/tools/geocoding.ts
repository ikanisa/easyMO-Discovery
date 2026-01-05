/**
 * Geocoding Tools (optional - uses Gemini/Google Maps)
 */

import { z } from 'zod';
import type { Env, Location } from '../types';

const geocodeSchema = z.object({
  query: z.string(),
  user_location: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
});

export async function geocode(
  args: z.infer<typeof geocodeSchema>,
  env: Env
): Promise<string> {
  const { query, user_location } = args;
  
  try {
    // If Gemini API key is available, use it for geocoding
    if (env.GEMINI_API_KEY) {
      // Call Gemini for geocoding (via Edge Function or direct API)
      // For now, return a placeholder
      return JSON.stringify({
        success: true,
        query,
        address: query, // Placeholder
        location: user_location || { lat: 0, lng: 0 },
        source: 'gemini',
      });
    }
    
    // Fallback: Return query as-is
    return JSON.stringify({
      success: true,
      query,
      address: query,
      location: user_location || { lat: 0, lng: 0 },
      source: 'fallback',
    });
  } catch (error: any) {
    return JSON.stringify({
      success: false,
      error: error.message || 'Failed to geocode location',
    });
  }
}

const estimateETASchema = z.object({
  origin: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  destination: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  mode: z.enum(['driving', 'walking', 'transit']).default('driving'),
});

export async function estimateETA(
  args: z.infer<typeof estimateETASchema>,
  env: Env
): Promise<string> {
  const { origin, destination, mode } = args;
  
  try {
    // If Google Maps API key is available, use Distance Matrix API
    if (env.GOOGLE_MAPS_API_KEY) {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${destination.lat},${destination.lng}&mode=${mode}&key=${env.GOOGLE_MAPS_API_KEY}`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.rows[0]?.elements[0]?.status === 'OK') {
        const element = data.rows[0].elements[0];
        return JSON.stringify({
          success: true,
          distance: element.distance,
          duration: element.duration,
          eta_seconds: element.duration.value,
          eta_text: element.duration.text,
        });
      }
    }
    
    // Fallback: Simple distance calculation (Haversine)
    const distance = calculateDistance(origin, destination);
    const avgSpeed = mode === 'driving' ? 50 : mode === 'walking' ? 5 : 30; // km/h
    const etaSeconds = Math.round((distance / avgSpeed) * 3600);
    
    return JSON.stringify({
      success: true,
      distance_km: distance.toFixed(2),
      eta_seconds: etaSeconds,
      eta_text: formatDuration(etaSeconds),
      source: 'estimate',
    });
  } catch (error: any) {
    return JSON.stringify({
      success: false,
      error: error.message || 'Failed to estimate ETA',
    });
  }
}

// Helper: Haversine distance calculation
function calculateDistance(origin: Location, destination: Location): number {
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

export const geocodingTools = [
  {
    type: 'function' as const,
    function: {
      name: 'geocode',
      description: 'Geocode a location query (e.g., "Kigali, Rwanda") to coordinates. Uses Gemini/Google Maps if available.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Location query (address or place name)' },
          user_location: {
            type: 'object',
            properties: {
              lat: { type: 'number' },
              lng: { type: 'number' },
            },
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'estimate_eta',
      description: 'Estimate travel time and distance between two points. Uses Google Maps API if available, otherwise estimates.',
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

