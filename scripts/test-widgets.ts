/**
 * Test Widget Generation
 * 
 * This script tests widget generation from tool results.
 * Run with: npx tsx scripts/test-widgets.ts
 */

import { generateWidgetFromToolResult } from '../services/agent-runtime/src/utils/widgets';

console.log('Testing Widget Generation\n');

// Test 1: Matches widget
console.log('Test 1: Matches Widget');
const matchesResult = JSON.stringify({
  widget_type: 'matches',
  matches: [
    {
      id: '123',
      user_id: 'user-123',
      display_name: 'Driver Jean',
      vehicle_type: 'moto',
      distance_km: 2.1,
      distance_m: 2100,
      eta_seconds: 360,
      phone: '+250788123456',
    },
    {
      id: '456',
      user_id: 'user-456',
      display_name: 'Driver Marie',
      vehicle_type: 'cab',
      distance_km: 3.5,
      distance_m: 3500,
      eta_seconds: 600,
      phone: '+250788234567',
    },
  ],
});

const matchesWidget = generateWidgetFromToolResult('create_match_candidates', matchesResult);
console.log('Generated widget:', JSON.stringify(matchesWidget, null, 2));
console.log('\n');

// Test 2: Listings widget
console.log('Test 2: Listings Widget');
const listingsResult = JSON.stringify({
  widget_type: 'listings',
  listings: [
    {
      id: 'listing-1',
      title: 'iPhone 12 Pro',
      price: 500000,
      currency: 'RWF',
      address: 'Kigali Heights',
      description: 'Good condition, 128GB',
      phone_number: '+250788123456',
    },
    {
      id: 'listing-2',
      title: 'Samsung Galaxy S21',
      price: 450000,
      currency: 'RWF',
      address: 'Remera',
      description: 'Like new, 256GB',
      phone_number: '+250788234567',
    },
  ],
});

const listingsWidget = generateWidgetFromToolResult('search_listings', listingsResult);
console.log('Generated widget:', JSON.stringify(listingsWidget, null, 2));
console.log('\n');

// Test 3: Broadcast progress widget
console.log('Test 3: Broadcast Progress Widget');
const broadcastResult = JSON.stringify({
  widget_type: 'broadcast_progress',
  campaign_id: 'campaign-123',
  total: 15,
  sent: 15,
  delivered: 12,
  replied: 3,
  failed: 0,
  targets: [
    { id: 'biz-1', name: 'Pharmacy ABC', status: 'replied' },
    { id: 'biz-2', name: 'Pharmacy XYZ', status: 'delivered' },
    { id: 'biz-3', name: 'Pharmacy DEF', status: 'sent' },
  ],
});

const broadcastWidget = generateWidgetFromToolResult('broadcast_start', broadcastResult);
console.log('Generated widget:', JSON.stringify(broadcastWidget, null, 2));
console.log('\n');

// Test 4: Handoff widget
console.log('Test 4: Handoff Widget');
const handoffResult = JSON.stringify({
  widget_type: 'handoff',
  who: 'Driver Jean',
  nextStep: 'Contact via WhatsApp: +250788123456. Agree on pickup time and price.',
});

const handoffWidget = generateWidgetFromToolResult('reveal_contact', handoffResult);
console.log('Generated widget:', JSON.stringify(handoffWidget, null, 2));
console.log('\n');

console.log('✅ All widget tests completed!');

