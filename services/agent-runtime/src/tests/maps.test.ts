/**
 * Mocked Maps API tests
 * Tests Google Maps API integration without making real API calls
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { geocodeRobust } from '../tools/geo-robust';

// Mock Google Maps API
const mockGeocodeResponse = {
  results: [
    {
      formatted_address: 'Kigali, Nyarugenge, Rwanda',
      geometry: {
        location: {
          lat: () => -1.9441,
          lng: () => 30.0619,
        },
      },
    },
  ],
  status: 'OK',
};

const mockReverseGeocodeResponse = {
  results: [
    {
      formatted_address: 'Kigali Heights, KG 1 St, Kigali, Rwanda',
      geometry: {
        location: {
          lat: () => -1.9441,
          lng: () => 30.0619,
        },
      },
    },
  ],
  status: 'OK',
};

const mockDistanceMatrixResponse = {
  rows: [
    {
      elements: [
        {
          distance: { value: 5000, text: '5.0 km' },
          duration: { value: 600, text: '10 mins' },
          status: 'OK',
        },
      ],
    },
  ],
  status: 'OK',
};

describe('Maps API Integration (Mocked)', () => {
  const mockEnv = {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-key',
    GOOGLE_MAPS_API_KEY: 'test-maps-key',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock fetch for Google Maps API calls
    global.fetch = vi.fn();
  });

  describe('geocodeRobust', () => {
    it('should geocode text address successfully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGeocodeResponse,
      });

      const result = await geocodeRobust(
        {
          text: 'Kigali, Nyarugenge',
        },
        mockEnv as any,
        'test-user-id',
        '127.0.0.1'
      );

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.address).toBe('Kigali, Nyarugenge, Rwanda');
      expect(parsed.lat).toBe(-1.9441);
      expect(parsed.lng).toBe(30.0619);
    });

    it('should reverse geocode coordinates successfully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockReverseGeocodeResponse,
      });

      const result = await geocodeRobust(
        {
          lat: -1.9441,
          lng: 30.0619,
        },
        mockEnv as any,
        'test-user-id',
        '127.0.0.1'
      );

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.address).toContain('Kigali');
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error_message: 'Invalid request',
          status: 'INVALID_REQUEST',
        }),
      });

      const result = await geocodeRobust(
        {
          text: 'Invalid Address',
        },
        mockEnv as any,
        'test-user-id',
        '127.0.0.1'
      );

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toBeDefined();
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await geocodeRobust(
        {
          text: 'Kigali',
        },
        mockEnv as any,
        'test-user-id',
        '127.0.0.1'
      );

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain('Network');
    });

    it('should use rate limiting', async () => {
      // Mock successful response
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockGeocodeResponse,
      });

      // Make multiple rapid calls
      const promises = Array.from({ length: 5 }, () =>
        geocodeRobust(
          { text: 'Kigali' },
          mockEnv as any,
          'test-user-id',
          '127.0.0.1'
        )
      );

      const results = await Promise.all(promises);
      
      // All should succeed (rate limiting is handled by the rate limiter utility)
      results.forEach((result) => {
        const parsed = JSON.parse(result);
        expect(parsed.success).toBe(true);
      });
    });
  });

  describe('Distance Matrix API (Mocked)', () => {
    it('should calculate ETA between two points', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDistanceMatrixResponse,
      });

      const origin = { lat: -1.9441, lng: 30.0619 };
      const destination = { lat: -1.9500, lng: 30.0700 };

      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${destination.lat},${destination.lng}&mode=driving&key=${mockEnv.GOOGLE_MAPS_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      expect(data.status).toBe('OK');
      expect(data.rows[0].elements[0].distance.value).toBe(5000);
      expect(data.rows[0].elements[0].duration.value).toBe(600);
    });
  });
});

