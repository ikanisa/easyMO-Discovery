/**
 * Robust Mobility Tools
 * - set_presence
 * - create_ride_intent
 * - find_driver_matches
 * - find_passenger_requests
 * - reveal_contact
 */

import { z } from 'zod';
import type { Env } from '../types';
import { createSupabaseClient } from '../utils/supabase';
import { enforcePresenceTTL, enforceIntentTTL, sanitizeLocationForDisplay, formatLocationAsArea } from '../utils/policy';
import { locationSchema } from '@easymo/shared/schemas';

/**
 * Set presence (enhanced version of publish_presence)
 */
const setPresenceSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['passenger', 'driver', 'vendor']),
  lat: z.number(),
  lng: z.number(),
  is_online: z.boolean().default(true),
  radius_m: z.number().optional(), // For display purposes only
  meta: z.record(z.any()).optional(), // Additional metadata (vehicle_type, etc.)
});

export async function setPresence(
  args: z.infer<typeof setPresenceSchema>,
  env: Env
): Promise<string> {
  const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  
  const { user_id, role, lat, lng, is_online, meta } = args;
  
  try {
    // Enforce TTL
    const ttl = enforcePresenceTTL(meta?.ttl);
    
    // Use RPC function for secure presence updates
    const { data: result, error: rpcError } = await supabase.rpc('create_or_refresh_presence', {
      p_user_id: user_id,
      p_role: role,
      p_lat: lat,
      p_lng: lng,
      p_is_online: is_online,
      p_ttl_seconds: ttl,
      p_meta: meta || {},
    });
    
    if (rpcError || !result) {
      throw new Error(rpcError?.message || 'RPC call returned no result');
    }
    
    return JSON.stringify({
      success: true,
      message: `Presence set as ${role}${is_online ? ' (online)' : ' (offline)'}`,
      location: sanitizeLocationForDisplay({ lat, lng }),
      is_online,
      expires_in: ttl,
    });
  } catch (error: any) {
    return JSON.stringify({
      success: false,
      error: error.message || 'Failed to set presence',
    });
  }
}

/**
 * Create ride intent (enhanced)
 */
const createRideIntentRobustSchema = z.object({
  user_id: z.string().uuid(),
  pickup_lat: z.number(),
  pickup_lng: z.number(),
  dropoff_lat: z.number().optional(),
  dropoff_lng: z.number().optional(),
  notes: z.string().optional(),
});

export async function createRideIntentRobust(
  args: z.infer<typeof createRideIntentRobustSchema>,
  env: Env
): Promise<string> {
  const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  
  const { user_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, notes } = args;
  
  try {
    const ttl = enforceIntentTTL(1800); // 30 minutes default
    
    // Create ride intent
    const { data: intent, error } = await supabase
      .from('ride_intents')
      .insert({
        passenger_id: user_id,
        pickup_lat,
        pickup_lng,
        pickup_location: `POINT(${pickup_lng} ${pickup_lat})`,
        dropoff_lat: dropoff_lat || null,
        dropoff_lng: dropoff_lng || null,
        dropoff_location: dropoff_lat && dropoff_lng ? `POINT(${dropoff_lng} ${dropoff_lat})` : null,
        notes: notes || null,
        status: 'pending',
        expires_at: new Date(Date.now() + ttl * 1000).toISOString(),
      })
      .select('id, status, expires_at')
      .single();
    
    if (error || !intent) {
      throw new Error(`Failed to create ride intent: ${error?.message || 'Unknown error'}`);
    }
    
    return JSON.stringify({
      success: true,
      intent_id: intent.id,
      status: intent.status,
      expires_at: intent.expires_at,
      pickup: {
        location: sanitizeLocationForDisplay({ lat: pickup_lat, lng: pickup_lng }),
      },
      dropoff: dropoff_lat && dropoff_lng ? {
        location: sanitizeLocationForDisplay({ lat: dropoff_lat, lng: dropoff_lng }),
      } : null,
      message: 'Ride intent created. Finding nearby drivers...',
    });
  } catch (error: any) {
    return JSON.stringify({
      success: false,
      error: error.message || 'Failed to create ride intent',
    });
  }
}

/**
 * Find driver matches for a ride intent
 */
const findDriverMatchesSchema = z.object({
  intent_id: z.string().uuid().optional(),
  pickup_lat: z.number().optional(),
  pickup_lng: z.number().optional(),
  radius_km: z.number().default(5),
  limit: z.number().default(10),
});

export async function findDriverMatches(
  args: z.infer<typeof findDriverMatchesSchema>,
  env: Env
): Promise<string> {
  const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  
  const { intent_id, pickup_lat, pickup_lng, radius_km, limit } = args;
  
  try {
    let lat: number;
    let lng: number;
    
    // Get pickup location from intent if provided
    if (intent_id) {
      const { data: intent, error } = await supabase
        .from('ride_intents')
        .select('pickup_lat, pickup_lng')
        .eq('id', intent_id)
        .single();
      
      if (error || !intent) {
        throw new Error(`Ride intent not found: ${error?.message || 'Unknown error'}`);
      }
      
      lat = intent.pickup_lat;
      lng = intent.pickup_lng;
    } else if (pickup_lat && pickup_lng) {
      lat = pickup_lat;
      lng = pickup_lng;
    } else {
      throw new Error('Either intent_id or pickup coordinates required');
    }
    
    // Find nearby drivers
    const radiusMeters = radius_km * 1000;
    const { data: results, error: rpcError } = await supabase.rpc('get_nearby_presence', {
      p_role: 'driver',
      p_lat: lat,
      p_lng: lng,
      p_radius_m: radiusMeters,
      p_limit: limit,
    });
    
    if (rpcError) {
      throw new Error(rpcError.message || 'Failed to get nearby presence');
    }
    
    if (!Array.isArray(results)) {
      return JSON.stringify({ matches: [], count: 0 });
    }
    
    // Format matches (sanitize locations)
    const matches = results.map((r: any) => ({
      driver_id: r.user_id,
      vehicle_type: r.meta?.vehicle_type || 'other',
      location: sanitizeLocationForDisplay({ lat: r.lat, lng: r.lng }),
      distance_km: (r.distance_m / 1000).toFixed(2),
      distance_m: r.distance_m,
      is_online: r.is_online,
      last_seen_at: r.last_seen_at,
    }));
    
    // If intent_id provided, create match candidates
    if (intent_id) {
      try {
        const { error: matchError } = await supabase.rpc('create_match_candidates', {
          p_intent_id: intent_id,
          p_limit_candidates: limit,
        });
        if (matchError) {
          console.warn('Failed to create match candidates:', matchError);
        }
      } catch (error) {
        console.warn('Failed to create match candidates:', error);
      }
    }
    
    return JSON.stringify({
      success: true,
      matches,
      count: matches.length,
      radius_km,
      intent_id: intent_id || null,
    });
  } catch (error: any) {
    return JSON.stringify({
      success: false,
      matches: [],
      error: error.message || 'Failed to find driver matches',
    });
  }
}

/**
 * Find passenger requests for a driver
 */
const findPassengerRequestsSchema = z.object({
  driver_lat: z.number(),
  driver_lng: z.number(),
  radius_km: z.number().default(5),
  limit: z.number().default(10),
});

export async function findPassengerRequests(
  args: z.infer<typeof findPassengerRequestsSchema>,
  env: Env
): Promise<string> {
  const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  
  const { driver_lat, driver_lng, radius_km, limit } = args;
  
  try {
    // Find nearby ride intents (pending status)
    const radiusMeters = radius_km * 1000;
    
    // Query ride intents within radius
    const { data: intents, error } = await supabase
      .from('ride_intents')
      .select('id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, notes, created_at, expires_at')
      .eq('status', 'pending')
      .gte('expires_at', new Date().toISOString())
      .limit(limit);
    
    if (error) {
      throw error;
    }
    
    if (!intents || intents.length === 0) {
      return JSON.stringify({
        success: true,
        requests: [],
        count: 0,
      });
    }
    
    // Filter by distance and format (sanitize locations)
    const requests = intents
      .map((intent: any) => {
        // Calculate distance (simplified - in production use PostGIS)
        const distance = calculateDistance(
          { lat: driver_lat, lng: driver_lng },
          { lat: intent.pickup_lat, lng: intent.pickup_lng }
        );
        
        if (distance > radius_km) {
          return null;
        }
        
        return {
          intent_id: intent.id,
          pickup: {
            location: sanitizeLocationForDisplay({ lat: intent.pickup_lat, lng: intent.pickup_lng }),
          },
          dropoff: intent.dropoff_lat && intent.dropoff_lng ? {
            location: sanitizeLocationForDisplay({ lat: intent.dropoff_lat, lng: intent.dropoff_lng }),
          } : null,
          distance_km: distance.toFixed(2),
          notes: intent.notes,
          created_at: intent.created_at,
        };
      })
      .filter((r: any) => r !== null)
      .sort((a: any, b: any) => parseFloat(a.distance_km) - parseFloat(b.distance_km))
      .slice(0, limit);
    
    return JSON.stringify({
      success: true,
      requests,
      count: requests.length,
      radius_km,
    });
  } catch (error: any) {
    return JSON.stringify({
      success: false,
      requests: [],
      error: error.message || 'Failed to find passenger requests',
    });
  }
}

/**
 * Reveal contact information for a match (with explicit consent)
 */
const revealContactSchema = z.object({
  match_id: z.string().uuid(),
  user_id: z.string().uuid(), // User requesting contact
  confirmed: z.boolean().default(false), // Must be explicitly true
});

export async function revealContact(
  args: z.infer<typeof revealContactSchema>,
  env: Env
): Promise<string> {
  const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  
  const { match_id, user_id, confirmed } = args;
  
  try {
    if (!confirmed) {
      return JSON.stringify({
        success: false,
        error: 'Explicit confirmation required to reveal contact information',
        message: 'Please confirm you want to reveal contact information for this match.',
      });
    }
    
    // Get match details
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('intent_id, driver_id')
      .eq('id', match_id)
      .single();
    
    if (matchError || !match) {
      throw new Error(`Match not found: ${matchError?.message || 'Unknown error'}`);
    }
    
    // Verify user is part of the match (passenger or driver)
    const { data: intent } = await supabase
      .from('ride_intents')
      .select('passenger_id')
      .eq('id', match.intent_id)
      .single();
    
    if (!intent || (intent.passenger_id !== user_id && match.driver_id !== user_id)) {
      return JSON.stringify({
        success: false,
        error: 'Unauthorized: You are not part of this match',
      });
    }
    
    // Get contact information (masked by default)
    const targetUserId = user_id === intent.passenger_id ? match.driver_id : intent.passenger_id;
    
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('phone_number, display_name')
      .eq('user_id', targetUserId)
      .single();
    
    if (!profile) {
      return JSON.stringify({
        success: false,
        error: 'Contact information not available',
      });
    }
    
    // Mask phone number (show last 4 digits only)
    const phone = profile.phone_number || '';
    const maskedPhone = phone.length > 4 ? `***${phone.slice(-4)}` : '***';
    
    return JSON.stringify({
      success: true,
      contact: {
        display_name: profile.display_name || 'Driver',
        phone_masked: maskedPhone,
        phone_full: profile.phone_number, // Full number only if explicitly confirmed
        message: 'Contact information revealed. Use responsibly.',
      },
    });
  } catch (error: any) {
    return JSON.stringify({
      success: false,
      error: error.message || 'Failed to reveal contact',
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

// Export tool definitions
export const mobilityRobustTools = [
  {
    type: 'function' as const,
    function: {
      name: 'set_presence',
      description: 'Set user presence (location and online status) for mobility matching. Drivers/vendors use this to go online.',
      parameters: {
        type: 'object',
        properties: {
          user_id: { type: 'string', description: 'User UUID' },
          role: { type: 'string', enum: ['passenger', 'driver', 'vendor'], description: 'User role' },
          lat: { type: 'number', description: 'Latitude' },
          lng: { type: 'number', description: 'Longitude' },
          is_online: { type: 'boolean', description: 'Online status', default: true },
          radius_m: { type: 'number', description: 'Display radius (for UI only)' },
          meta: { type: 'object', description: 'Additional metadata (vehicle_type, etc.)' },
        },
        required: ['user_id', 'role', 'lat', 'lng'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_ride_intent',
      description: 'Create a ride request (intent) with pickup and optional dropoff locations.',
      parameters: {
        type: 'object',
        properties: {
          user_id: { type: 'string', description: 'User UUID (passenger)' },
          pickup_lat: { type: 'number', description: 'Pickup latitude' },
          pickup_lng: { type: 'number', description: 'Pickup longitude' },
          dropoff_lat: { type: 'number', description: 'Dropoff latitude (optional)' },
          dropoff_lng: { type: 'number', description: 'Dropoff longitude (optional)' },
          notes: { type: 'string', description: 'Additional notes' },
        },
        required: ['user_id', 'pickup_lat', 'pickup_lng'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'find_driver_matches',
      description: 'Find nearby drivers for a ride intent or pickup location.',
      parameters: {
        type: 'object',
        properties: {
          intent_id: { type: 'string', description: 'Ride intent UUID (optional if pickup coords provided)' },
          pickup_lat: { type: 'number', description: 'Pickup latitude (optional if intent_id provided)' },
          pickup_lng: { type: 'number', description: 'Pickup longitude (optional if intent_id provided)' },
          radius_km: { type: 'number', description: 'Search radius in kilometers', default: 5 },
          limit: { type: 'number', description: 'Maximum number of matches', default: 10 },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'find_passenger_requests',
      description: 'Find nearby passenger ride requests for a driver.',
      parameters: {
        type: 'object',
        properties: {
          driver_lat: { type: 'number', description: 'Driver latitude' },
          driver_lng: { type: 'number', description: 'Driver longitude' },
          radius_km: { type: 'number', description: 'Search radius in kilometers', default: 5 },
          limit: { type: 'number', description: 'Maximum number of requests', default: 10 },
        },
        required: ['driver_lat', 'driver_lng'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'reveal_contact',
      description: 'Reveal contact information for a match. Requires explicit confirmation.',
      parameters: {
        type: 'object',
        properties: {
          match_id: { type: 'string', description: 'Match UUID' },
          user_id: { type: 'string', description: 'User UUID requesting contact' },
          confirmed: { type: 'boolean', description: 'Must be explicitly true to reveal contact', default: false },
        },
        required: ['match_id', 'user_id'],
      },
    },
  },
];

