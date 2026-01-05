/**
 * Enhanced Marketplace Tools
 * - Vendor onboarding assist
 * - Listing ranking
 * - Business search (enhanced)
 */

import { z } from 'zod';
import type { Env } from '../types';
import { createSupabaseClient } from '../utils/supabase';
import { onboardVendorSchema, createListingSchema, searchOffersSchema } from '@easymo/shared/schemas';
import { sanitizeLocationForDisplay, formatLocationAsArea } from '../utils/policy';

/**
 * Onboard a vendor (business registration assist)
 */
export async function onboardVendor(
  args: z.infer<typeof onboardVendorSchema>,
  env: Env
): Promise<string> {
  const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  
  const { user_id, business_name, business_type, description, phone_number, location, address } = args;
  
  try {
    // Create user role for vendor
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id,
        role: 'vendor',
        is_active: true,
      }, {
        onConflict: 'user_id,role',
      });
    
    if (roleError) {
      console.error('Failed to add vendor role:', roleError);
    }
    
    // Create marketplace listing if location provided
    let listingId: string | null = null;
    if (location) {
      const { data: listing, error: listingError } = await supabase
        .from('marketplace_listings')
        .insert({
          user_id,
          title: business_name,
          description: description || `Business type: ${business_type}`,
          category: business_type,
          phone_number,
          location: `POINT(${location.lng} ${location.lat})`,
          status: 'active',
        })
        .select('id')
        .single();
      
      if (!listingError && listing) {
        listingId = listing.id;
      }
    }
    
    // Return structured response
    return JSON.stringify({
      success: true,
      vendor_id: user_id,
      business_name,
      business_type,
      listing_id: listingId,
      location: location ? sanitizeLocationForDisplay(location) : null,
      address: address || (location ? formatLocationAsArea(location) : null),
      message: `Vendor "${business_name}" onboarded successfully! ${listingId ? 'Listing created.' : 'Add location to create listing.'}`,
    });
  } catch (error: any) {
    return JSON.stringify({
      success: false,
      error: error.message || 'Failed to onboard vendor',
    });
  }
}

/**
 * Rank listings by relevance (simplified - can be enhanced with ML)
 */
const rankListingsSchema = z.object({
  listings: z.array(z.object({
    id: z.string(),
    title: z.string(),
    category: z.string(),
    distance_km: z.number().optional(),
    price: z.number().optional(),
  })),
  query: z.string().optional(),
  user_preferences: z.object({
    price_sensitivity: z.enum(['low', 'medium', 'high']).optional(),
    prefer_nearby: z.boolean().optional(),
  }).optional(),
});

export async function rankListings(
  args: z.infer<typeof rankListingsSchema>,
  env: Env
): Promise<string> {
  const { listings, query, user_preferences } = args;
  
  try {
    // Simple ranking algorithm
    // In production, this could use ML or more sophisticated scoring
    const ranked = listings.map((listing: any) => {
      let score = 0.5; // Base score
      
      // Distance scoring (closer = higher score)
      if (listing.distance_km !== undefined) {
        score += Math.max(0, 0.5 - (listing.distance_km / 10)); // Max 0.5 points for distance
      }
      
      // Query relevance (simple keyword matching)
      if (query) {
        const queryLower = query.toLowerCase();
        const titleLower = listing.title.toLowerCase();
        const categoryLower = listing.category.toLowerCase();
        
        if (titleLower.includes(queryLower) || categoryLower.includes(queryLower)) {
          score += 0.3;
        }
      }
      
      // Price sensitivity (if user prefers lower prices)
      if (user_preferences?.price_sensitivity === 'high' && listing.price) {
        // Lower price = higher score (simplified)
        score += Math.max(0, 0.2 - (listing.price / 100000)); // Max 0.2 points
      }
      
      return {
        ...listing,
        relevance_score: Math.min(1.0, score),
      };
    });
    
    // Sort by relevance score
    ranked.sort((a, b) => b.relevance_score - a.relevance_score);
    
    return JSON.stringify({
      success: true,
      listings: ranked,
      count: ranked.length,
      message: `Ranked ${ranked.length} listings by relevance`,
    });
  } catch (error: any) {
    return JSON.stringify({
      success: false,
      error: error.message || 'Failed to rank listings',
    });
  }
}

// Enhanced marketplace tools
export const marketplaceEnhancedTools = [
  {
    type: 'function' as const,
    function: {
      name: 'onboard_vendor',
      description: 'Assist with vendor (business) onboarding. Creates vendor role and optional marketplace listing.',
      parameters: {
        type: 'object',
        properties: {
          user_id: { type: 'string', description: 'User UUID' },
          business_name: { type: 'string', description: 'Business name' },
          business_type: { type: 'string', description: 'Business type/category' },
          description: { type: 'string', description: 'Business description' },
          phone_number: { type: 'string', description: 'Business phone number' },
          location: {
            type: 'object',
            properties: {
              lat: { type: 'number' },
              lng: { type: 'number' },
            },
          },
          address: { type: 'string', description: 'Business address' },
        },
        required: ['user_id', 'business_name', 'business_type', 'phone_number'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'rank_listings',
      description: 'Rank marketplace listings by relevance based on query and user preferences.',
      parameters: {
        type: 'object',
        properties: {
          listings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                category: { type: 'string' },
                distance_km: { type: 'number' },
                price: { type: 'number' },
              },
            },
          },
          query: { type: 'string', description: 'Search query' },
          user_preferences: {
            type: 'object',
            properties: {
              price_sensitivity: { type: 'string', enum: ['low', 'medium', 'high'] },
              prefer_nearby: { type: 'boolean' },
            },
          },
        },
        required: ['listings'],
      },
    },
  },
];

