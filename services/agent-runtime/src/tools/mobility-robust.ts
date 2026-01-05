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
    // Enforce TTL (max 15 minutes, default 15 minutes)
    // Note: Updates faster than 10s are automatically throttled in database
    const ttl = enforcePresenceTTL(meta?.ttl || 900); // Default 15 minutes
    
    // Use RPC function for secure presence updates with rate limiting
    const { data: result, error: rpcError } = await supabase.rpc('create_or_refresh_presence', {
      p_user_id: user_id,
      p_role: role,
      p_lat: lat,
      p_lng: lng,
      p_is_online: is_online,
      p_ttl_seconds: ttl, // Will be capped at 15min in function
      p_meta: meta || {},
    });
    
    if (rpcError) {
      throw new Error(rpcError.message || 'RPC call failed');
    }
    
    // Result is the user_id (even if update was throttled)
    return JSON.stringify({
      success: true,
      message: `Presence set as ${role}${is_online ? ' (online)' : ' (offline)'}`,
      location: sanitizeLocationForDisplay({ lat, lng }),
      is_online,
      expires_in: ttl,
      note: 'Updates faster than 10 seconds are automatically throttled',
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
    // Use safe RPC function with rate limiting and TTL enforcement
    const { data: intentId, error: rpcError } = await supabase.rpc('create_ride_intent_safe', {
      p_passenger_id: user_id,
      p_pickup_lat: pickup_lat,
      p_pickup_lng: pickup_lng,
      p_pickup_address: null, // Can be enhanced to geocode
      p_dropoff_lat: dropoff_lat || null,
      p_dropoff_lng: dropoff_lng || null,
      p_dropoff_address: null,
      p_notes: notes || null,
      p_ttl_seconds: 900, // 15 minutes (enforced 10-15 min range)
    });
    
    if (rpcError || !intentId) {
      // Check if it's a rate limit error
      if (rpcError?.message?.includes('Rate limit exceeded')) {
        throw new Error('Too many ride requests. Please wait a few minutes before creating another.');
      }
      throw new Error(rpcError?.message || 'Failed to create ride intent');
    }
    
    // Fetch the created intent to get full details
    const { data: intent, error: fetchError } = await supabase
      .from('ride_intents')
      .select('id, status, expires_at, created_at')
      .eq('id', intentId)
      .single();
    
    if (fetchError || !intent) {
      // Intent was created but we can't fetch it, return what we have
      return JSON.stringify({
        success: true,
        intent_id: intentId,
        status: 'pending',
        message: 'Ride intent created. Finding nearby drivers...',
      });
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
 * Find passenger requests for a driver (with throttling)
 */
const findPassengerRequestsSchema = z.object({
  driver_id: z.string().uuid(),
  driver_lat: z.number(),
  driver_lng: z.number(),
  radius_km: z.number().default(10),
  limit: z.number().default(20),
});

export async function findPassengerRequests(
  args: z.infer<typeof findPassengerRequestsSchema>,
  env: Env
): Promise<string> {
  const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  
  const { driver_id, driver_lat, driver_lng, radius_km, limit } = args;
  
  try {
    // Use throttled RPC function with rate limiting
    const { data: intents, error: rpcError } = await supabase.rpc('get_nearby_ride_intents', {
      p_driver_id: driver_id,
      p_lat: driver_lat,
      p_lng: driver_lng,
      p_radius_m: radius_km * 1000, // Convert km to meters
      p_limit: limit,
    });
    
    if (rpcError) {
      // Check if it's a rate limit error
      if (rpcError.message?.includes('Rate limit exceeded')) {
        throw new Error('Too many match queries. Please wait before querying again.');
      }
      throw rpcError;
    }
    
    if (!intents || intents.length === 0) {
      return JSON.stringify({
        success: true,
        requests: [],
        count: 0,
        message: 'No nearby ride requests found',
      });
    }
    
    // Format results (sanitize locations)
    const requests = intents.map((intent: any) => ({
      intent_id: intent.intent_id,
      pickup: {
        location: sanitizeLocationForDisplay({ lat: intent.pickup_lat, lng: intent.pickup_lng }),
        address: intent.pickup_address,
      },
      dropoff: intent.dropoff_lat ? {
        location: sanitizeLocationForDisplay({ lat: intent.dropoff_lat, lng: intent.dropoff_lng }),
        address: intent.dropoff_address,
      } : undefined,
      distance_km: (intent.distance_m / 1000).toFixed(2),
      notes: intent.notes,
      created_at: intent.created_at,
      expires_at: intent.expires_at,
    }));
    
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

