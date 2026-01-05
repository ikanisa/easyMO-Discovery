/**
 * Enhanced Mobility Tools
 * - Ride intents
 * - Matching
 * - Presence (moved from presence.ts)
 * - Explain/handoff
 */

import { z } from 'zod';
import type { Env } from '../types';
import { createSupabaseClient } from '../utils/supabase';
import { enforcePresenceTTL, enforceIntentTTL, sanitizeLocationForDisplay, formatLocationAsArea } from '../utils/policy';
import { publishPresenceSchema, findMatchesSchema, createRideIntentSchema } from '@easymo/shared/schemas';

// Re-export presence tools
export { publishPresence, findMatches } from './presence';
export { presenceTools } from './presence';
import { presenceTools } from './presence';

/**
 * Create ride intent
 */
export async function createRideIntent(
  args: z.infer<typeof createRideIntentSchema>,
  env: Env
): Promise<string> {
  const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  
  const { user_id, pickup_location, pickup_address, dropoff_location, dropoff_address, notes, ttl_seconds } = args;
  
  try {
    const ttl = enforceIntentTTL(ttl_seconds);
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
    
    // Create ride intent
    const { data: intent, error } = await supabase
      .from('ride_intents')
      .insert({
        passenger_id: user_id,
        pickup_lat: pickup_location.lat,
        pickup_lng: pickup_location.lng,
        pickup_location: `POINT(${pickup_location.lng} ${pickup_location.lat})`,
        pickup_address: pickup_address || formatLocationAsArea(pickup_location),
        dropoff_lat: dropoff_location?.lat,
        dropoff_lng: dropoff_location?.lng,
        dropoff_location: dropoff_location ? `POINT(${dropoff_location.lng} ${dropoff_location.lat})` : null,
        dropoff_address: dropoff_address || (dropoff_location ? formatLocationAsArea(dropoff_location) : null),
        notes: notes || null,
        status: 'pending',
        expires_at: expiresAt,
      })
      .select('id, status, expires_at')
      .single();
    
    if (error || !intent) {
      throw new Error(`Failed to create ride intent: ${error?.message || 'Unknown error'}`);
    }
    
    // Return structured response for UI card
    return JSON.stringify({
      success: true,
      intent_id: intent.id,
      status: intent.status,
      expires_at: intent.expires_at,
      pickup: {
        address: pickup_address || formatLocationAsArea(pickup_location),
        location: sanitizeLocationForDisplay(pickup_location),
      },
      dropoff: dropoff_location ? {
        address: dropoff_address || formatLocationAsArea(dropoff_location),
        location: sanitizeLocationForDisplay(dropoff_location),
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
 * Create match candidates for a ride intent
 */
const createMatchCandidatesSchema = z.object({
  intent_id: z.string().uuid(),
  limit: z.number().default(10),
});

export async function createMatchCandidates(
  args: z.infer<typeof createMatchCandidatesSchema>,
  env: Env
): Promise<string> {
  const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  
  const { intent_id, limit } = args;
  
  try {
    // Use RPC function to create matches
    const { data: matches, error } = await supabase.rpc('create_match_candidates', {
      p_intent_id: intent_id,
      p_limit_candidates: limit,
    });
    
    if (error) {
      throw new Error(error.message || 'Failed to create match candidates');
    }
    
    if (!Array.isArray(matches)) {
      return JSON.stringify({
        success: true,
        matches: [],
        count: 0,
        message: 'No drivers found nearby',
      });
    }
    
    // Format matches for UI (sanitize locations)
    const formattedMatches = matches.map((m: any) => ({
      match_id: m.match_id,
      driver_id: m.driver_id,
      score: m.score,
      eta_seconds: m.eta_seconds,
      distance_km: (m.distance_m / 1000).toFixed(2),
      eta_minutes: Math.ceil((m.eta_seconds || 0) / 60),
    }));
    
    return JSON.stringify({
      success: true,
      matches: formattedMatches,
      count: formattedMatches.length,
      intent_id,
      message: `Found ${formattedMatches.length} driver${formattedMatches.length !== 1 ? 's' : ''} nearby`,
    });
  } catch (error: any) {
    return JSON.stringify({
      success: false,
      error: error.message || 'Failed to create match candidates',
    });
  }
}

/**
 * Explain ride matching process
 */
const explainMatchingSchema = z.object({
  intent_id: z.string().uuid().optional(),
});

export async function explainMatching(
  args: z.infer<typeof explainMatchingSchema>,
  env: Env
): Promise<string> {
  // This is a helper function that returns explanation text
  // No database operations needed
  
  return JSON.stringify({
    success: true,
    explanation: `Here's how ride matching works:

1. **Create a ride intent** - Tell me where you want to go
2. **Find drivers** - I'll search for nearby drivers within 5km
3. **Match scoring** - Drivers are ranked by distance and availability
4. **ETA calculation** - Estimated arrival time is calculated
5. **Driver selection** - You can see available drivers and choose one

The matching happens automatically when you create a ride intent. Drivers who are online and nearby will be notified.`,
  });
}

// Enhanced mobility tools
export const mobilityTools = [
  ...presenceTools,
  {
    type: 'function' as const,
    function: {
      name: 'create_ride_intent',
      description: 'Create a ride request (intent) for mobility matching. Passengers use this to request a ride.',
      parameters: {
        type: 'object',
        properties: {
          user_id: { type: 'string', description: 'User UUID (passenger)' },
          pickup_location: {
            type: 'object',
            properties: {
              lat: { type: 'number' },
              lng: { type: 'number' },
            },
            required: ['lat', 'lng'],
          },
          pickup_address: { type: 'string', description: 'Human-readable pickup address' },
          dropoff_location: {
            type: 'object',
            properties: {
              lat: { type: 'number' },
              lng: { type: 'number' },
            },
          },
          dropoff_address: { type: 'string', description: 'Human-readable dropoff address' },
          notes: { type: 'string', description: 'Additional notes for the ride' },
          ttl_seconds: { type: 'number', description: 'Time to live in seconds (default: 1800 = 30 min)' },
        },
        required: ['user_id', 'pickup_location'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_match_candidates',
      description: 'Create match candidates for a ride intent. Automatically finds nearby drivers and creates matches.',
      parameters: {
        type: 'object',
        properties: {
          intent_id: { type: 'string', description: 'Ride intent UUID' },
          limit: { type: 'number', description: 'Maximum number of candidates (default: 10)' },
        },
        required: ['intent_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'explain_matching',
      description: 'Explain how the ride matching process works to the user.',
      parameters: {
        type: 'object',
        properties: {
          intent_id: { type: 'string', description: 'Optional: specific intent ID to explain' },
        },
      },
    },
  },
];

