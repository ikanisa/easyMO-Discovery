/**
 * Shared Zod schemas for tool inputs/outputs
 */

import { z } from 'zod';

// Location schemas
export const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

// Presence schemas
export const publishPresenceSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['passenger', 'driver', 'vendor']),
  location: locationSchema,
  vehicle_type: z.enum(['moto', 'cab', 'liffan', 'truck', 'other', 'shop']).optional(),
  ttl: z.number().optional(),
});

export const findMatchesSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['passenger', 'driver']),
  location: locationSchema,
  radius_km: z.number().default(5),
  vehicle_type: z.enum(['moto', 'cab', 'liffan', 'truck', 'other']).optional(),
});

// Marketplace schemas
export const searchOffersSchema = z.object({
  query: z.string(),
  location: locationSchema.optional(),
  filters: z.object({
    category: z.string().optional(),
    radius_km: z.number().default(5),
    price_min: z.number().optional(),
    price_max: z.number().optional(),
  }).optional(),
});

export const createListingSchema = z.object({
  user_id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  price: z.number().optional(),
  currency: z.string().default('RWF'),
  location: locationSchema.optional(),
});

// Payment schemas
export const generateMomoQRSchema = z.object({
  country_id: z.string().default('rw'),
  tx_type: z.enum(['send', 'pay']).default('pay'),
  phone_number: z.string().optional(),
  amount: z.string().optional(),
  merchant_code: z.string().optional(),
});

export const parseQRSchema = z.object({
  qr_data: z.string(),
});

// Geocoding schemas
export const geocodeSchema = z.object({
  query: z.string(),
  user_location: locationSchema.optional(),
});

export const estimateETASchema = z.object({
  origin: locationSchema,
  destination: locationSchema,
  mode: z.enum(['driving', 'walking', 'transit']).default('driving'),
});

// Ride intent schemas
export const createRideIntentSchema = z.object({
  user_id: z.string().uuid(),
  pickup_location: locationSchema,
  pickup_address: z.string().optional(),
  dropoff_location: locationSchema.optional(),
  dropoff_address: z.string().optional(),
  notes: z.string().optional(),
  ttl_seconds: z.number().optional(),
});

// Vendor onboarding schema
export const onboardVendorSchema = z.object({
  user_id: z.string().uuid(),
  business_name: z.string(),
  business_type: z.string(),
  description: z.string().optional(),
  phone_number: z.string(),
  location: locationSchema.optional(),
  address: z.string().optional(),
});

// Receipt handling schema
export const saveReceiptSchema = z.object({
  user_id: z.string().uuid(),
  payment_request_id: z.string().uuid().optional(),
  amount: z.number(),
  currency: z.string().default('RWF'),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

// Robust tool schemas
export const setPresenceSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['passenger', 'driver', 'vendor']),
  lat: z.number(),
  lng: z.number(),
  is_online: z.boolean().default(true),
  radius_m: z.number().optional(),
  meta: z.record(z.any()).optional(),
});

export const findDriverMatchesSchema = z.object({
  intent_id: z.string().uuid().optional(),
  pickup_lat: z.number().optional(),
  pickup_lng: z.number().optional(),
  radius_km: z.number().default(5),
  limit: z.number().default(10),
});

export const findPassengerRequestsSchema = z.object({
  driver_id: z.string().uuid(),
  driver_lat: z.number(),
  driver_lng: z.number(),
  radius_km: z.number().default(10),
  limit: z.number().default(20),
});

export const revealContactSchema = z.object({
  match_id: z.string().uuid(),
  user_id: z.string().uuid(),
  confirmed: z.boolean().default(false),
});

export const searchListingsSchema = z.object({
  query: z.string(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  category: z.string().optional(),
  min_price: z.number().optional(),
  max_price: z.number().optional(),
  limit: z.number().default(20),
});

export const createListingRobustSchema = z.object({
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

export const vendorOnboardingStatusSchema = z.object({
  user_id: z.string().uuid(),
});

export const generateMomoQRRobustSchema = z.object({
  amount: z.number().optional(),
  currency: z.string().default('RWF'),
  reference: z.string(),
  merchant_id: z.string().optional(),
});

export const parseQRRobustSchema = z.object({
  payload: z.string(),
});

export const geocodeRobustSchema = z.object({
  text: z.string(),
  user_location: locationSchema.optional(),
});

export const reverseGeocodeRobustSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

export const estimateETARobustSchema = z.object({
  origin: locationSchema,
  destination: locationSchema,
  mode: z.enum(['driving', 'walking', 'transit']).default('driving'),
});

export const geminiNormalizeLocationTextSchema = z.object({
  text: z.string(),
  country: z.string().optional(),
  city: z.string().optional(),
  user_location: locationSchema.optional(),
});

export const geminiSummarizeForDriverSchema = z.object({
  intent: z.object({
    pickup_address: z.string(),
    dropoff_address: z.string().optional(),
    notes: z.string().optional(),
    distance_km: z.number().optional(),
    eta_minutes: z.number().optional(),
  }),
});

// Agent request/response schemas
export const agentRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })),
  agent_type: z.enum(['mobility', 'marketplace', 'payments', 'support', 'router']).optional(),
  user_id: z.string().uuid().optional(),
  user_location: locationSchema.optional(),
  conversation_id: z.string().uuid().optional(),
  stream: z.boolean().default(false),
});

export const agentResponseSchema = z.object({
  message: z.string(),
  agent_type: z.enum(['mobility', 'marketplace', 'payments', 'support', 'router']),
  tool_calls: z.array(z.object({
    id: z.string(),
    type: z.literal('function'),
    function: z.object({
      name: z.string(),
      arguments: z.string(),
    }),
  })).optional(),
  tool_results: z.array(z.object({
    tool_call_id: z.string(),
    role: z.literal('tool'),
    name: z.string(),
    content: z.string(),
  })).optional(),
  conversation_id: z.string().uuid().optional(),
});

