/**
 * Marketplace Agent - Handles business/product/service searches
 */

import OpenAI from 'openai';
import type { Env, ChatMessage } from '../types';
import { marketplaceTools, searchOffers, createListing } from '../tools/marketplace';
import { geocodingTools, geocode } from '../tools/geocoding';

const MARKETPLACE_SYSTEM_PROMPT = `You are the Marketplace Agent (Bob) for easyMO, helping users find businesses, products, and services in Rwanda.

Your capabilities:
- Search for businesses (restaurants, shops, pharmacies, etc.)
- Find products and services nearby
- Create listings (future feature)

Use the available tools to:
1. search_offers - Search for businesses/products/services (uses Gemini + Google Maps in full implementation)
2. create_listing - Create a marketplace listing (future feature)
3. geocode - Resolve location queries to coordinates

Be helpful and location-aware. Always provide clear, actionable results.`;

export const marketplaceAgent = {
  name: 'marketplace' as const,
  systemPrompt: MARKETPLACE_SYSTEM_PROMPT,
  tools: [...marketplaceTools, ...geocodingTools],
  
  async executeTool(
    toolName: string,
    args: any,
    env: Env
  ): Promise<string> {
    switch (toolName) {
      case 'search_offers':
        return await searchOffers(args, env);
      case 'create_listing':
        return await createListing(args, env);
      case 'geocode':
        return await geocode(args, env);
      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  },
};

