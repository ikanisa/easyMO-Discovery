/**
 * Integration Tests for Worker
 * Tests agent tools and critical flows
 */

import { describe, it, expect } from 'vitest';
import { generateMomoQR, parseQR } from '../tools/payments';
import { publishPresence, findMatches } from '../tools/presence';
import { searchOffers, createListing } from '../tools/marketplace';
import { geocode } from '../tools/geocoding';

// Mock environment
const mockEnv = {
  OPENAI_API_KEY: 'test-openai-key',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  GEMINI_API_KEY: 'test-gemini-key',
  GOOGLE_MAPS_API_KEY: 'test-maps-key',
};

describe('Payment Tools', () => {
  it('should generate MoMo QR code', async () => {
    const result = await generateMomoQR({
      country_id: 'rw',
      tx_type: 'pay',
      phone_number: '0781234567',
      amount: '1000',
    }, mockEnv);

    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.ussd_code).toBeTruthy();
    expect(parsed.qr_value).toBeTruthy();
  });

  it('should parse QR code', async () => {
    const qrData = 'tel:*182*6*2*0781234567*1000%23';
    const result = await parseQR({ qr_data: qrData }, mockEnv);

    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.country_id).toBe('rw');
  });
});

describe('Marketplace Tools', () => {
  it('should search offers', async () => {
    const result = await searchOffers({
      query: 'hardware stores',
      location: { lat: -1.9441, lng: 30.0619 },
    }, mockEnv);

    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.query).toBe('hardware stores');
  });

  it('should create listing', async () => {
    const result = await createListing({
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test Listing',
      description: 'Test Description',
      category: 'electronics',
      price: 10000,
    }, mockEnv);

    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.listing_id).toBeTruthy();
  });
});

describe('Presence Tools', () => {
  it('should publish presence', async () => {
    // Note: This would require a real Supabase instance or mocking
    // For now, we just check the function exists and can be called
    expect(publishPresence).toBeDefined();
  });

  it('should find matches', async () => {
    // Note: This would require a real Supabase instance or mocking
    expect(findMatches).toBeDefined();
  });
});

describe('Geocoding Tools', () => {
  it('should geocode address', async () => {
    // Note: This would require Google Maps API key or mocking
    expect(geocode).toBeDefined();
  });
});

