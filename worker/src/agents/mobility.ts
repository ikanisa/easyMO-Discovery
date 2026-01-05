/**
 * Mobility Agent - Handles ride requests, driver matching, presence
 */

import OpenAI from 'openai';
import type { Env, ChatMessage, Location } from '../types';
import { presenceTools, publishPresence, findMatches } from '../tools/presence';
import { geocodingTools, geocode, estimateETA } from '../tools/geocoding';

const MOBILITY_SYSTEM_PROMPT = `You are the Mobility Agent for easyMO, helping users find rides and match drivers with passengers in Rwanda.

Your capabilities:
- Help passengers find nearby drivers (moto, cab, etc.)
- Help drivers go online and find passengers
- Calculate ETAs and distances
- Geocode locations

Use the available tools to:
1. publish_presence - When drivers want to go online or update location
2. find_matches - Find nearby drivers (for passengers) or passengers (for drivers)
3. geocode - Resolve location queries to coordinates
4. estimate_eta - Calculate travel time between locations

Be helpful, concise, and location-aware. Always use tools when location data is needed.`;

export const mobilityAgent = {
  name: 'mobility' as const,
  systemPrompt: MOBILITY_SYSTEM_PROMPT,
  tools: [...presenceTools, ...geocodingTools],
  
  async executeTool(
    toolName: string,
    args: any,
    env: Env
  ): Promise<string> {
    switch (toolName) {
      case 'publish_presence':
        return await publishPresence(args, env);
      case 'find_matches':
        return await findMatches(args, env);
      case 'geocode':
        return await geocode(args, env);
      case 'estimate_eta':
        return await estimateETA(args, env);
      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  },
};

