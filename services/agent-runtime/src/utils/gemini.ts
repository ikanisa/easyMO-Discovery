/**
 * Gemini API client (server-side only)
 * Used only for optional enhancement tools, never as chat engine
 */

import type { Env } from '../types';
import { ToolRateLimiter } from './toolRateLimit';

export class GeminiClient {
  private apiKey: string;
  private rateLimiter: ToolRateLimiter;
  private userId?: string;
  private userIP?: string;

  constructor(env: Env, rateLimiter: ToolRateLimiter, userId?: string, userIP?: string) {
    if (!env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }
    this.apiKey = env.GEMINI_API_KEY;
    this.rateLimiter = rateLimiter;
    this.userId = userId;
    this.userIP = userIP;
  }

  /**
   * Normalize location text using Gemini
   * Uses Gemini to understand ambiguous location queries in context
   */
  async normalizeLocationText(
    text: string,
    context?: { country?: string; city?: string; userLocation?: { lat: number; lng: number } }
  ): Promise<{ normalized: string; confidence: number }> {
    // Check rate limit
    const rateLimit = await this.rateLimiter.checkGeminiLimit(this.userId, this.userIP);
    if (!rateLimit.allowed) {
      throw new Error(`Gemini rate limit exceeded. Retry after ${rateLimit.retryAfter} seconds.`);
    }

    try {
      const contextStr = context
        ? `Context: ${context.country || 'Rwanda'}, ${context.city || 'Kigali'}. User location: ${context.userLocation ? `${context.userLocation.lat}, ${context.userLocation.lng}` : 'unknown'}.`
        : 'Context: Rwanda, Kigali.';

      const prompt = `${contextStr}
      
Normalize this location query: "${text}"

Return JSON: { "normalized": "string", "confidence": 0.0-1.0 }
The normalized string should be a clear, unambiguous location name that can be geocoded.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }],
          }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          normalized: parsed.normalized || text,
          confidence: parsed.confidence || 0.5,
        };
      }

      return {
        normalized: text.trim(),
        confidence: 0.5,
      };
    } catch (error: any) {
      console.error('Gemini normalize location error:', error);
      // Fallback: return original text
      return {
        normalized: text,
        confidence: 0.3,
      };
    }
  }

  /**
   * Summarize ride intent for driver notification
   * Creates a short, actionable message for drivers
   */
  async summarizeForDriver(intent: {
    pickup_address: string;
    dropoff_address?: string;
    notes?: string;
    distance_km?: number;
    eta_minutes?: number;
  }): Promise<string> {
    // Check rate limit
    const rateLimit = await this.rateLimiter.checkGeminiLimit(this.userId, this.userIP);
    if (!rateLimit.allowed) {
      // Fallback: simple template
      return `New ride: ${intent.pickup_address}${intent.dropoff_address ? ` → ${intent.dropoff_address}` : ''}${intent.eta_minutes ? ` (${intent.eta_minutes} min away)` : ''}`;
    }

    try {
      const prompt = `Create a short, actionable message for a driver about a new ride request.

Pickup: ${intent.pickup_address}
${intent.dropoff_address ? `Dropoff: ${intent.dropoff_address}` : 'Dropoff: Not specified'}
${intent.notes ? `Notes: ${intent.notes}` : ''}
${intent.distance_km ? `Distance: ${intent.distance_km}km` : ''}
${intent.eta_minutes ? `ETA: ${intent.eta_minutes} minutes` : ''}

Return ONLY the message text (max 100 characters). Be concise and action-oriented.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }],
          }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      return text.trim().substring(0, 100); // Max 100 chars
    } catch (error: any) {
      console.error('Gemini summarize error:', error);
      // Fallback: simple template
      return `New ride: ${intent.pickup_address}${intent.dropoff_address ? ` → ${intent.dropoff_address}` : ''}${intent.eta_minutes ? ` (${intent.eta_minutes} min)` : ''}`;
    }
  }
}

