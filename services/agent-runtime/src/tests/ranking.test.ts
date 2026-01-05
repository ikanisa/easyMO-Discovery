/**
 * Unit tests for ranking logic
 */

import { describe, it, expect } from 'vitest';
import { rankListings } from '../tools/marketplace-enhanced';

describe('Ranking Logic', () => {
  const mockListings = [
    {
      id: '1',
      title: 'Kigali Heights Restaurant',
      category: 'restaurant',
      distance_km: 0.5,
      price: 5000,
    },
    {
      id: '2',
      title: 'Nyabugogo Market',
      category: 'market',
      distance_km: 2.0,
      price: 2000,
    },
    {
      id: '3',
      title: 'Kacyiru Shopping Center',
      category: 'shopping',
      distance_km: 5.0,
      price: 10000,
    },
    {
      id: '4',
      title: 'Kimisagara Restaurant',
      category: 'restaurant',
      distance_km: 1.0,
      price: 3000,
    },
  ];

  it('should rank by distance when no query or preferences', async () => {
    const result = await rankListings(
      {
        listings: mockListings,
      },
      {} as any
    );

    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.listings).toHaveLength(4);
    
    // Closest should be first
    expect(parsed.listings[0].id).toBe('1'); // 0.5km
    expect(parsed.listings[0].relevance_score).toBeGreaterThan(0.5);
  });

  it('should boost relevance for query matches', async () => {
    const result = await rankListings(
      {
        listings: mockListings,
        query: 'restaurant',
      },
      {} as any
    );

    const parsed = JSON.parse(result);
    const restaurantIds = parsed.listings
      .filter((l: any) => l.category === 'restaurant')
      .map((l: any) => l.id);
    
    // Restaurants should be ranked higher
    expect(restaurantIds).toContain('1');
    expect(restaurantIds).toContain('4');
    
    // Check that restaurant scores are higher
    const restaurant1 = parsed.listings.find((l: any) => l.id === '1');
    const market = parsed.listings.find((l: any) => l.id === '2');
    expect(restaurant1.relevance_score).toBeGreaterThan(market.relevance_score);
  });

  it('should prioritize lower prices for price-sensitive users', async () => {
    const result = await rankListings(
      {
        listings: mockListings,
        user_preferences: {
          price_sensitivity: 'high',
        },
      },
      {} as any
    );

    const parsed = JSON.parse(result);
    
    // Lower price items should score higher
    const market = parsed.listings.find((l: any) => l.id === '2'); // 2000 RWF
    const shopping = parsed.listings.find((l: any) => l.id === '3'); // 10000 RWF
    
    expect(market.relevance_score).toBeGreaterThan(shopping.relevance_score);
  });

  it('should combine distance, query, and price factors', async () => {
    const result = await rankListings(
      {
        listings: mockListings,
        query: 'restaurant',
        user_preferences: {
          price_sensitivity: 'high',
        },
      },
      {} as any
    );

    const parsed = JSON.parse(result);
    
    // Restaurant 4 (1km, 3000) should rank higher than Restaurant 1 (0.5km, 5000)
    // if price sensitivity is high enough
    const restaurant1 = parsed.listings.find((l: any) => l.id === '1');
    const restaurant4 = parsed.listings.find((l: any) => l.id === '4');
    
    // Both should have high scores (restaurant match + price consideration)
    expect(restaurant1.relevance_score).toBeGreaterThan(0.5);
    expect(restaurant4.relevance_score).toBeGreaterThan(0.5);
  });

  it('should handle empty listings', async () => {
    const result = await rankListings(
      {
        listings: [],
      },
      {} as any
    );

    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.listings).toHaveLength(0);
    expect(parsed.count).toBe(0);
  });

  it('should cap relevance scores at 1.0', async () => {
    const result = await rankListings(
      {
        listings: [
          {
            id: '1',
            title: 'Perfect Match Restaurant',
            category: 'restaurant',
            distance_km: 0.1,
            price: 1000,
          },
        ],
        query: 'restaurant',
        user_preferences: {
          price_sensitivity: 'high',
        },
      },
      {} as any
    );

    const parsed = JSON.parse(result);
    expect(parsed.listings[0].relevance_score).toBeLessThanOrEqual(1.0);
  });
});

