/**
 * Presence Tools for Mobility Agent
 */

import { z } from 'zod';
import type { Env, Location, Role, VehicleType } from '../types';
import { createSupabaseClient } from '../utils/supabase';

const publishPresenceSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['passenger', 'driver', 'vendor']),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  vehicle_type: z.enum(['moto', 'cab', 'liffan', 'truck', 'other', 'shop']).optional(),
  ttl: z.number().optional(), // Time to live in seconds
});

export async function publishPresence(
  args: z.infer<typeof publishPresenceSchema>,
  env: Env
): Promise<string> {
  const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  
  const { user_id, role, location, vehicle_type, ttl } = args;
  
  try {
    // Format location as PostGIS POINT
    const locationPoint = `POINT(${location.lng} ${location.lat})`;
    
    await supabase.upsert('presence', {
      user_id,
      role,
      vehicle_type: vehicle_type || 'other',
      location: locationPoint,
      is_online: true,
      last_seen: new Date().toISOString(),
    }, 'user_id');
    
    return JSON.stringify({
      success: true,
      message: `Presence published as ${role}${vehicle_type ? ` (${vehicle_type})` : ''}`,
      location: { lat: location.lat, lng: location.lng },
    });
  } catch (error: any) {
    return JSON.stringify({
      success: false,
      error: error.message || 'Failed to publish presence',
    });
  }
}

const findMatchesSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['passenger', 'driver']),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  radius_km: z.number().default(5),
  vehicle_type: z.enum(['moto', 'cab', 'liffan', 'truck', 'other']).optional(),
});

export async function findMatches(
  args: z.infer<typeof findMatchesSchema>,
  env: Env
): Promise<string> {
  const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  
  const { role, location, radius_km, vehicle_type } = args;
  
  try {
    // Determine target role (passengers find drivers, drivers find passengers)
    const targetRole = role === 'passenger' ? 'driver' : 'passenger';
    
    // Call RPC function to get nearby users
    const radiusMeters = radius_km * 1000;
    const results = await supabase.rpc('get_nearby_drivers', {
      user_lat: location.lat,
      user_lng: location.lng,
      radius_meters: radiusMeters,
    });
    
    if (!Array.isArray(results)) {
      return JSON.stringify({ matches: [] });
    }
    
    // Filter by vehicle type if specified
    const filtered = vehicle_type
      ? results.filter((r: any) => r.vehicle_type === vehicle_type)
      : results;
    
    // Format results
    const matches = filtered.map((r: any) => ({
      user_id: r.user_id,
      role: targetRole,
      vehicle_type: r.vehicle_type,
      location: { lat: r.lat, lng: r.lng },
      distance_km: (r.dist_meters / 1000).toFixed(2),
      last_seen: r.last_seen,
    }));
    
    return JSON.stringify({
      matches,
      count: matches.length,
      radius_km,
    });
  } catch (error: any) {
    return JSON.stringify({
      matches: [],
      error: error.message || 'Failed to find matches',
    });
  }
}

export const presenceTools = [
  {
    type: 'function' as const,
    function: {
      name: 'publish_presence',
      description: 'Publish user presence (location and role) for mobility matching. Drivers use this to go online.',
      parameters: {
        type: 'object',
        properties: {
          user_id: { type: 'string', description: 'User UUID' },
          role: { type: 'string', enum: ['passenger', 'driver', 'vendor'], description: 'User role' },
          location: {
            type: 'object',
            properties: {
              lat: { type: 'number' },
              lng: { type: 'number' },
            },
            required: ['lat', 'lng'],
          },
          vehicle_type: { type: 'string', enum: ['moto', 'cab', 'liffan', 'truck', 'other', 'shop'] },
          ttl: { type: 'number', description: 'Time to live in seconds' },
        },
        required: ['user_id', 'role', 'location'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'find_matches',
      description: 'Find nearby drivers or passengers for mobility matching. Passengers find drivers, drivers find passengers.',
      parameters: {
        type: 'object',
        properties: {
          user_id: { type: 'string', description: 'User UUID' },
          role: { type: 'string', enum: ['passenger', 'driver'], description: 'User role (passenger finds drivers, driver finds passengers)' },
          location: {
            type: 'object',
            properties: {
              lat: { type: 'number' },
              lng: { type: 'number' },
            },
            required: ['lat', 'lng'],
          },
          radius_km: { type: 'number', description: 'Search radius in kilometers', default: 5 },
          vehicle_type: { type: 'string', enum: ['moto', 'cab', 'liffan', 'truck', 'other'] },
        },
        required: ['user_id', 'role', 'location'],
      },
    },
  },
];

