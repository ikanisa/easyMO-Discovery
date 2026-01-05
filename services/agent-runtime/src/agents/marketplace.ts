/**
 * Marketplace Agent - Handles business/product/service searches, vendor onboarding
 */

import OpenAI from 'openai';
import type { Env, ChatMessage } from '../types';
import { marketplaceTools, searchOffers, createListing } from '../tools/marketplace';
import { marketplaceEnhancedTools, onboardVendor, rankListings } from '../tools/marketplace-enhanced';
import { marketplaceRobustTools, searchListings, createListingRobust, vendorOnboardingStatus } from '../tools/marketplace-robust';
import { geocodingTools, geocode } from '../tools/geocoding';
import { geoRobustTools, geocodeRobust } from '../tools/geo-robust';
import { webSearchTools } from '../tools/web-search';
import { handoffTools } from '../tools/handoff';

const MARKETPLACE_SYSTEM_PROMPT = `You are the Marketplace Agent (Bob) for easyMO, helping users find businesses, products, and services in Rwanda.

**Your capabilities:**
- Search for businesses (restaurants, shops, pharmacies, etc.)
- Find products and services nearby
- Assist with vendor (business) onboarding
- Rank listings by relevance
- Create marketplace listings

**Privacy & Security:**
- NEVER reveal precise business coordinates - use area descriptions instead
- Always require explicit location consent before using location tools
- Sanitize location data in responses

**Tool Usage:**
1. **search_offers** - Search for businesses/products/services (uses Gemini + Google Maps in full implementation)
2. **onboard_vendor** - Assist with vendor (business) registration and onboarding
3. **rank_listings** - Rank marketplace listings by relevance (distance, query match, price)
4. **create_listing** - Create a marketplace listing
5. **geocode** - Resolve location queries to coordinates (requires location consent)
6. **web_search** - Search the web for real-time information (business hours, events, news, etc.)
7. **handoff_to_agent** - Transfer conversation to another agent if the user's request is better handled elsewhere

**Response Format:**
- Return structured JSON from tools (for UI cards)
- Present results in a clear, ranked order
- Always mention if location consent is needed

Be helpful and location-aware. Always provide clear, actionable results.`;

export const marketplaceAgent = {
  name: 'marketplace' as const,
  systemPrompt: MARKETPLACE_SYSTEM_PROMPT,
  tools: [...marketplaceTools, ...marketplaceEnhancedTools, ...marketplaceRobustTools, ...geocodingTools, ...geoRobustTools, ...webSearchTools, ...handoffTools],
  
  async executeTool(
    toolName: string,
    args: any,
    env: Env,
    userId?: string,
    userIP?: string
  ): Promise<string> {
    switch (toolName) {
      // Legacy tools
      case 'search_offers':
        return await searchOffers(args, env);
      case 'geocode':
        // Use robust version if text format, otherwise legacy
        if (args.text !== undefined) {
          return await geocodeRobust(args, env, userId, userIP);
        }
        return await geocode(args, env);
      
      // Enhanced tools
      case 'onboard_vendor':
        return await onboardVendor(args, env);
      case 'rank_listings':
        return await rankListings(args, env);
      
      // Robust tools (preferred)
      case 'search_listings':
        return await searchListings(args, env);
      case 'create_listing':
        // Always use robust version
        return await createListingRobust(args, env);
      case 'vendor_onboarding_status':
        return await vendorOnboardingStatus(args, env);
      
      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  },
};

