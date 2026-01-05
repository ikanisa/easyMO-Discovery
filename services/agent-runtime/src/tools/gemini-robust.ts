/**
 * Gemini Tools (Optional Enhancers Only)
 * - gemini_normalize_location_text
 * - gemini_summarize_for_driver
 * 
 * NOTE: Gemini is NEVER the chat engine. Only used inside tools when needed.
 */

import { z } from 'zod';
import type { Env } from '../types';
import { GeminiClient } from '../utils/gemini';
import { ToolRateLimiter } from '../utils/toolRateLimit';
import { locationSchema } from '@easymo/shared/schemas';

/**
 * Normalize location text using Gemini
 */
const geminiNormalizeLocationTextSchema = z.object({
  text: z.string(),
  country: z.string().optional(),
  city: z.string().optional(),
  user_location: locationSchema.optional(),
});

export async function geminiNormalizeLocationText(
  args: z.infer<typeof geminiNormalizeLocationTextSchema>,
  env: Env,
  userId?: string,
  userIP?: string
): Promise<string> {
  const { text, country, city, user_location } = args;
  
  try {
    // Check if Gemini is available
    if (!env.GEMINI_API_KEY) {
      return JSON.stringify({
        success: true,
        normalized: text,
        confidence: 0.3,
        source: 'fallback',
        message: 'Gemini not configured. Using original text.',
      });
    }
    
    // Initialize Gemini client
    const rateLimiter = new ToolRateLimiter(env.KV);
    const geminiClient = new GeminiClient(env, rateLimiter, userId, userIP);
    
    // Normalize location text
    const result = await geminiClient.normalizeLocationText(text, {
      country: country || 'Rwanda',
      city: city || 'Kigali',
      userLocation: user_location,
    });
    
    return JSON.stringify({
      success: true,
      normalized: result.normalized,
      confidence: result.confidence,
      source: 'gemini',
      original: text,
    });
  } catch (error: any) {
    // Fallback: Return original text
    return JSON.stringify({
      success: true,
      normalized: text,
      confidence: 0.3,
      source: 'fallback',
      error: error.message || 'Gemini normalization failed',
      message: 'Using original text as fallback.',
    });
  }
}

/**
 * Summarize ride intent for driver notification
 */
const geminiSummarizeForDriverSchema = z.object({
  intent: z.object({
    pickup_address: z.string(),
    dropoff_address: z.string().optional(),
    notes: z.string().optional(),
    distance_km: z.number().optional(),
    eta_minutes: z.number().optional(),
  }),
});

export async function geminiSummarizeForDriver(
  args: z.infer<typeof geminiSummarizeForDriverSchema>,
  env: Env,
  userId?: string,
  userIP?: string
): Promise<string> {
  const { intent } = args;
  
  try {
    // Check if Gemini is available
    if (!env.GEMINI_API_KEY) {
      // Fallback: Simple template
      const summary = `New ride: ${intent.pickup_address}${intent.dropoff_address ? ` → ${intent.dropoff_address}` : ''}${intent.eta_minutes ? ` (${intent.eta_minutes} min away)` : ''}`;
      
      return JSON.stringify({
        success: true,
        summary,
        source: 'fallback',
      });
    }
    
    // Initialize Gemini client
    const rateLimiter = new ToolRateLimiter(env.KV);
    const geminiClient = new GeminiClient(env, rateLimiter, userId, userIP);
    
    // Summarize for driver
    const summary = await geminiClient.summarizeForDriver(intent);
    
    return JSON.stringify({
      success: true,
      summary,
      source: 'gemini',
    });
  } catch (error: any) {
    // Fallback: Simple template
    const summary = `New ride: ${intent.pickup_address}${intent.dropoff_address ? ` → ${intent.dropoff_address}` : ''}${intent.eta_minutes ? ` (${intent.eta_minutes} min)` : ''}`;
    
    return JSON.stringify({
      success: true,
      summary,
      source: 'fallback',
      error: error.message || 'Gemini summarization failed',
      message: 'Using template as fallback.',
    });
  }
}

// Export tool definitions
export const geminiRobustTools = [
  {
    type: 'function' as const,
    function: {
      name: 'gemini_normalize_location_text',
      description: 'Normalize ambiguous location text using Gemini AI. Helps understand location queries in context. Optional enhancement tool only.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Location text to normalize' },
          country: { type: 'string', description: 'Country context (default: Rwanda)' },
          city: { type: 'string', description: 'City context (default: Kigali)' },
          user_location: {
            type: 'object',
            properties: {
              lat: { type: 'number' },
              lng: { type: 'number' },
            },
            description: 'User location for context',
          },
        },
        required: ['text'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'gemini_summarize_for_driver',
      description: 'Create a short, actionable message for drivers about a ride request. Optional enhancement tool only.',
      parameters: {
        type: 'object',
        properties: {
          intent: {
            type: 'object',
            properties: {
              pickup_address: { type: 'string' },
              dropoff_address: { type: 'string' },
              notes: { type: 'string' },
              distance_km: { type: 'number' },
              eta_minutes: { type: 'number' },
            },
            required: ['pickup_address'],
          },
        },
        required: ['intent'],
      },
    },
  },
];

