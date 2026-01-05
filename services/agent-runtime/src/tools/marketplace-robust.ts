/**
 * Robust Marketplace Tools
 * - search_listings
 * - create_listing
 * - vendor_onboarding_status
 */

import { z } from 'zod';
import type { Env } from '../types';
import { createSupabaseClient } from '../utils/supabase';
import { sanitizeLocationForDisplay } from '../utils/policy';

/**
 * Search marketplace listings
 */
const searchListingsSchema = z.object({
  query: z.string(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  category: z.string().optional(),
  min_price: z.number().optional(),
  max_price: z.number().optional(),
  limit: z.number().default(20),
});

export async function searchListings(
  args: z.infer<typeof searchListingsSchema>,
  env: Env
): Promise<string> {
  const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  
  const { query, lat, lng, category, min_price, max_price, limit } = args;
  
  try {
    let queryBuilder = supabase
      .from('marketplace_listings')
      .select('*')
      .eq('status', 'active')
      .limit(limit);
    
    // Filter by category
    if (category) {
      queryBuilder = queryBuilder.ilike('category', `%${category}%`);
    }
    
    // Filter by price range
    if (min_price !== undefined) {
      queryBuilder = queryBuilder.gte('price', min_price);
    }
    if (max_price !== undefined) {
      queryBuilder = queryBuilder.lte('price', max_price);
    }
    
    // Text search (title and description)
    if (query) {
      queryBuilder = queryBuilder.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
    }
    
    const { data: listings, error } = await queryBuilder;
    
    if (error) {
      throw error;
    }
    
    if (!listings || listings.length === 0) {
      return JSON.stringify({
        success: true,
        listings: [],
        count: 0,
        query,
      });
    }
    
    // Format listings (sanitize locations if present)
    const formatted = listings.map((listing: any) => {
      const result: any = {
        id: listing.id,
        title: listing.title,
        description: listing.description,
        category: listing.category,
        price: listing.price,
        currency: listing.currency || 'RWF',
        images: listing.images || [],
        vendor_id: listing.vendor_id,
        created_at: listing.created_at,
      };
      
      // Add location if available (sanitized)
      if (listing.location) {
        // Parse PostGIS POINT if needed
        // For now, assume lat/lng are stored separately or in meta
        if (listing.lat && listing.lng) {
          result.location = sanitizeLocationForDisplay({ lat: listing.lat, lng: listing.lng });
        }
      }
      
      // Calculate distance if user location provided
      if (lat && lng && listing.lat && listing.lng) {
        const distance = calculateDistance({ lat, lng }, { lat: listing.lat, lng: listing.lng });
        result.distance_km = distance.toFixed(2);
      }
      
      return result;
    });
    
    // Sort by distance if user location provided
    if (lat && lng) {
      formatted.sort((a: any, b: any) => {
        const distA = parseFloat(a.distance_km || '999');
        const distB = parseFloat(b.distance_km || '999');
        return distA - distB;
      });
    }
    
    return JSON.stringify({
      success: true,
      listings: formatted,
      count: formatted.length,
      query,
      filters: {
        category: category || null,
        min_price: min_price || null,
        max_price: max_price || null,
      },
    });
  } catch (error: any) {
    return JSON.stringify({
      success: false,
      listings: [],
      error: error.message || 'Failed to search listings',
    });
  }
}

/**
 * Create marketplace listing
 */
const createListingRobustSchema = z.object({
  user_id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  price: z.number().optional(),
  currency: z.string().default('RWF'),
  category: z.string(),
  images: z.array(z.string()).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export async function createListingRobust(
  args: z.infer<typeof createListingRobustSchema>,
  env: Env
): Promise<string> {
  const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  
  const { user_id, title, description, price, currency, category, images, lat, lng } = args;
  
  try {
    // Verify user has vendor role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user_id)
      .eq('role', 'vendor')
      .eq('is_active', true)
      .single();
    
    if (!roles) {
      return JSON.stringify({
        success: false,
        error: 'User must have vendor role to create listings',
        message: 'Please complete vendor onboarding first.',
      });
    }
    
    // Create listing
    const listingData: any = {
      vendor_id: user_id,
      title,
      description,
      category,
      price: price || null,
      currency,
      images: images || [],
      status: 'active',
    };
    
    // Add location if provided
    if (lat && lng) {
      listingData.location = `POINT(${lng} ${lat})`;
      listingData.lat = lat;
      listingData.lng = lng;
    }
    
    const { data: listing, error } = await supabase
      .from('marketplace_listings')
      .insert(listingData)
      .select('id, title, category, price, currency, created_at')
      .single();
    
    if (error || !listing) {
      throw new Error(`Failed to create listing: ${error?.message || 'Unknown error'}`);
    }
    
    return JSON.stringify({
      success: true,
      listing_id: listing.id,
      title: listing.title,
      category: listing.category,
      price: listing.price,
      currency: listing.currency,
      location: lat && lng ? sanitizeLocationForDisplay({ lat, lng }) : null,
      message: 'Listing created successfully',
    });
  } catch (error: any) {
    return JSON.stringify({
      success: false,
      error: error.message || 'Failed to create listing',
    });
  }
}

/**
 * Check vendor onboarding status
 */
const vendorOnboardingStatusSchema = z.object({
  user_id: z.string().uuid(),
});

export async function vendorOnboardingStatus(
  args: z.infer<typeof vendorOnboardingStatusSchema>,
  env: Env
): Promise<string> {
  const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  
  const { user_id } = args;
  
  try {
    // Check vendor role
    const { data: vendorRole } = await supabase
      .from('user_roles')
      .select('role, is_active, created_at')
      .eq('user_id', user_id)
      .eq('role', 'vendor')
      .single();
    
    // Check profile completion
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('display_name, phone_number, verified')
      .eq('user_id', user_id)
      .single();
    
    // Check listings count
    const { data: listings, error: listingsError } = await supabase
      .from('marketplace_listings')
      .select('id')
      .eq('vendor_id', user_id);
    
    const listingsCount = listingsError ? 0 : (Array.isArray(listings) ? listings.length : 0);
    
    const isVendor = !!vendorRole && vendorRole.is_active;
    const profileComplete = !!(profile?.display_name && profile?.phone_number);
    const hasListings = listingsCount > 0;
    
    return JSON.stringify({
      success: true,
      is_vendor: isVendor,
      profile_complete: profileComplete,
      has_listings: hasListings,
      onboarding_complete: isVendor && profileComplete,
      listings_count: listingsCount || 0,
      next_steps: !isVendor 
        ? ['Complete vendor registration']
        : !profileComplete
        ? ['Complete profile (name, phone)']
        : !hasListings
        ? ['Create your first listing']
        : ['Onboarding complete'],
    });
  } catch (error: any) {
    return JSON.stringify({
      success: false,
      error: error.message || 'Failed to check onboarding status',
    });
  }
}

// Helper: Calculate distance
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
export const marketplaceRobustTools = [
  {
    type: 'function' as const,
    function: {
      name: 'search_listings',
      description: 'Search marketplace listings by query, category, price range, and location.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query (searches title and description)' },
          lat: { type: 'number', description: 'User latitude (for distance sorting)' },
          lng: { type: 'number', description: 'User longitude (for distance sorting)' },
          category: { type: 'string', description: 'Category filter' },
          min_price: { type: 'number', description: 'Minimum price' },
          max_price: { type: 'number', description: 'Maximum price' },
          limit: { type: 'number', description: 'Maximum number of results', default: 20 },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_listing',
      description: 'Create a marketplace listing. User must have vendor role.',
      parameters: {
        type: 'object',
        properties: {
          user_id: { type: 'string', description: 'User UUID (vendor)' },
          title: { type: 'string', description: 'Listing title' },
          description: { type: 'string', description: 'Listing description' },
          price: { type: 'number', description: 'Price (optional)' },
          currency: { type: 'string', description: 'Currency code', default: 'RWF' },
          category: { type: 'string', description: 'Category' },
          images: { type: 'array', items: { type: 'string' }, description: 'Image URLs' },
          lat: { type: 'number', description: 'Latitude (optional)' },
          lng: { type: 'number', description: 'Longitude (optional)' },
        },
        required: ['user_id', 'title', 'description', 'category'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'vendor_onboarding_status',
      description: 'Check vendor onboarding status and completion steps.',
      parameters: {
        type: 'object',
        properties: {
          user_id: { type: 'string', description: 'User UUID' },
        },
        required: ['user_id'],
      },
    },
  },
];

