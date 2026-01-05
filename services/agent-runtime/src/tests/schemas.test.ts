/**
 * Contract tests for tool schemas
 * Ensures all tool inputs/outputs match their Zod schemas
 */

import { describe, it, expect } from 'vitest';
import {
  publishPresenceSchema,
  findMatchesSchema,
  createRideIntentSchema,
  searchListingsSchema,
  createListingRobustSchema,
  generateMomoQRSchema,
  geocodeRobustSchema,
} from '@easymo/shared/schemas';

describe('Tool Schema Contracts', () => {
  describe('publishPresenceSchema', () => {
    it('should accept valid presence data', () => {
      const valid = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        role: 'driver',
        lat: -1.9441,
        lng: 30.0619,
        is_online: true,
      };

      expect(() => publishPresenceSchema.parse(valid)).not.toThrow();
    });

    it('should reject invalid coordinates', () => {
      const invalid = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        role: 'driver',
        lat: 100, // Invalid: > 90
        lng: 30.0619,
      };

      expect(() => publishPresenceSchema.parse(invalid)).toThrow();
    });

    it('should reject invalid role', () => {
      const invalid = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        role: 'invalid_role',
        lat: -1.9441,
        lng: 30.0619,
      };

      expect(() => publishPresenceSchema.parse(invalid)).toThrow();
    });
  });

  describe('findMatchesSchema', () => {
    it('should accept valid match query', () => {
      const valid = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        role: 'passenger',
        location: {
          lat: -1.9441,
          lng: 30.0619,
        },
        radius_km: 5,
      };

      expect(() => findMatchesSchema.parse(valid)).not.toThrow();
    });

    it('should reject invalid radius', () => {
      const invalid = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        role: 'passenger',
        location: {
          lat: -1.9441,
          lng: 30.0619,
        },
        radius_km: -1, // Invalid: negative
      };

      expect(() => findMatchesSchema.parse(invalid)).toThrow();
    });
  });

  describe('createRideIntentSchema', () => {
    it('should accept valid ride intent', () => {
      const valid = {
        passenger_id: '123e4567-e89b-12d3-a456-426614174000',
        pickup_lat: -1.9441,
        pickup_lng: 30.0619,
        pickup_address: 'Kigali, Nyarugenge',
        dropoff_lat: -1.9500,
        dropoff_lng: 30.0700,
        dropoff_address: 'Kigali, Kacyiru',
      };

      expect(() => createRideIntentSchema.parse(valid)).not.toThrow();
    });

    it('should accept ride intent without dropoff', () => {
      const valid = {
        passenger_id: '123e4567-e89b-12d3-a456-426614174000',
        pickup_lat: -1.9441,
        pickup_lng: 30.0619,
        pickup_address: 'Kigali, Nyarugenge',
      };

      expect(() => createRideIntentSchema.parse(valid)).not.toThrow();
    });
  });

  describe('searchListingsSchema', () => {
    it('should accept valid search query', () => {
      const valid = {
        query: 'restaurant',
        lat: -1.9441,
        lng: 30.0619,
        category: 'food',
        min_price: 1000,
        max_price: 10000,
        limit: 20,
      };

      expect(() => searchListingsSchema.parse(valid)).not.toThrow();
    });

    it('should accept search without location', () => {
      const valid = {
        query: 'restaurant',
        limit: 20,
      };

      expect(() => searchListingsSchema.parse(valid)).not.toThrow();
    });
  });

  describe('createListingRobustSchema', () => {
    it('should accept valid listing', () => {
      const valid = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Listing',
        description: 'Test description',
        category: 'food',
        price: 5000,
        currency: 'RWF',
      };

      expect(() => createListingRobustSchema.parse(valid)).not.toThrow();
    });

    it('should reject missing required fields', () => {
      const invalid = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        // Missing title, description, category
      };

      expect(() => createListingRobustSchema.parse(invalid)).toThrow();
    });
  });

  describe('generateMomoQRSchema', () => {
    it('should accept valid MoMo QR request', () => {
      const valid = {
        amount: 5000,
        currency: 'RWF',
        reference: 'test-ref-123',
      };

      expect(() => generateMomoQRSchema.parse(valid)).not.toThrow();
    });

    it('should reject negative amounts', () => {
      const invalid = {
        amount: -100,
        currency: 'RWF',
        reference: 'test-ref-123',
      };

      expect(() => generateMomoQRSchema.parse(invalid)).toThrow();
    });
  });

  describe('geocodeRobustSchema', () => {
    it('should accept valid geocode request', () => {
      const valid = {
        text: 'Kigali, Nyarugenge',
      };

      expect(() => geocodeRobustSchema.parse(valid)).not.toThrow();
    });

    it('should accept reverse geocode request', () => {
      const valid = {
        lat: -1.9441,
        lng: 30.0619,
      };

      expect(() => geocodeRobustSchema.parse(valid)).not.toThrow();
    });

    it('should reject request without text or coordinates', () => {
      const invalid = {};

      expect(() => geocodeRobustSchema.parse(invalid)).toThrow();
    });
  });
});

