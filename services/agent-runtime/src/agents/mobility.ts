/**
 * Mobility Agent - Handles ride requests, driver matching, presence, ride intents
 */

import OpenAI from 'openai';
import type { Env, ChatMessage, Location } from '../types';
import { presenceTools, publishPresence, findMatches } from '../tools/presence';
import { mobilityTools, createRideIntent, createMatchCandidates, explainMatching } from '../tools/mobility';
import { mobilityRobustTools, setPresence, createRideIntentRobust, findDriverMatches, findPassengerRequests, revealContact } from '../tools/mobility-robust';
import { geocodingTools, geocode, estimateETA } from '../tools/geocoding';
import { geoRobustTools, geocodeRobust, reverseGeocodeRobust, estimateETARobust } from '../tools/geo-robust';
import { webSearchTools } from '../tools/web-search';
import { handoffTools, executeHandoff } from '../tools/handoff';

const MOBILITY_SYSTEM_PROMPT = `You are the Mobility Agent for easyMO, helping users find rides and match drivers with passengers in Rwanda.

**Your capabilities:**
- Help passengers create ride requests (intents) and find nearby drivers
- Help drivers go online (publish presence) and find passengers
- Create and manage ride intents with pickup/dropoff locations
- Generate match candidates for ride intents
- Calculate ETAs and distances
- Geocode locations
- Explain the matching process

**Privacy & Security:**
- NEVER reveal precise coordinates to users - use area descriptions instead
- Always require explicit location consent before using location tools
- Enforce TTL (time-to-live) for presence and ride intents
- Sanitize location data in responses

**Tool Usage:**
1. **publish_presence** - When drivers want to go online or update location (requires location consent)
2. **find_matches** - Find nearby drivers (for passengers) or passengers (for drivers) (requires location consent)
3. **create_ride_intent** - Create a ride request with pickup/dropoff locations (requires location consent)
4. **create_match_candidates** - Generate matches for a ride intent (automatic after creating intent)
5. **explain_matching** - Explain how the matching process works
6. **geocode** - Resolve location queries to coordinates (requires location consent)
7. **estimate_eta** - Calculate travel time between locations
8. **web_search** - Search the web for real-time information (weather, events, news, etc.)
9. **handoff_to_agent** - Transfer conversation to another agent if the user's request is better handled elsewhere

**Response Format:**
- Return structured JSON from tools (for UI cards)
- Explain results in natural language
- Always mention if location consent is needed

Be helpful, concise, and location-aware. Always ask for location consent before using location-based tools.`;

export const mobilityAgent = {
  name: 'mobility' as const,
  systemPrompt: MOBILITY_SYSTEM_PROMPT,
  tools: [...mobilityTools, ...mobilityRobustTools, ...geocodingTools, ...geoRobustTools, ...webSearchTools, ...handoffTools],
  
  async executeTool(
    toolName: string,
    args: any,
    env: Env,
    userId?: string,
    userIP?: string
  ): Promise<string> {
    switch (toolName) {
      // Legacy tools (for backward compatibility)
      case 'publish_presence':
        return await publishPresence(args, env);
      case 'find_matches':
        return await findMatches(args, env);
      case 'create_match_candidates':
        return await createMatchCandidates(args, env);
      case 'explain_matching':
        return await explainMatching(args, env);
      
      // Robust tools (preferred)
      case 'set_presence':
        return await setPresence(args, env);
      case 'create_ride_intent':
        // Use robust version if new format (pickup_lat/lng), otherwise legacy
        if (args.pickup_lat !== undefined) {
          return await createRideIntentRobust(args, env);
        }
        return await createRideIntent(args, env);
      case 'find_driver_matches':
        return await findDriverMatches(args, env);
      case 'find_passenger_requests':
        return await findPassengerRequests(args, env);
      case 'reveal_contact':
        return await revealContact(args, env);
      case 'geocode':
        // Use robust version with Google Maps if text format, otherwise legacy
        if (args.text !== undefined) {
          return await geocodeRobust(args, env, userId, userIP);
        }
        return await geocode(args, env);
      case 'reverse_geocode':
        return await reverseGeocodeRobust(args, env, userId, userIP);
      case 'estimate_eta':
        // Always use robust version (has Google Maps + fallback)
        return await estimateETARobust(args, env, userId, userIP);
      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  },
};

