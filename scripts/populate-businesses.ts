/**
 * Populate Businesses Table
 * 
 * This script populates the businesses table with sample data.
 * Run with: npx tsx scripts/populate-businesses.ts
 * 
 * Requires:
 * - SUPABASE_URL environment variable
 * - SUPABASE_SERVICE_ROLE_KEY environment variable
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Sample businesses data (Kigali, Rwanda)
const sampleBusinesses = [
  {
    name: 'Pharmacy ABC',
    category: 'pharmacy',
    address: 'Kigali Heights, Kacyiru',
    phone: '+250788123456',
    location: { lat: -1.9441, lng: 30.0619 }, // Kigali Heights approximate
    whatsapp_verified: true,
    is_active: true,
  },
  {
    name: 'Pharmacy XYZ',
    category: 'pharmacy',
    address: 'Remera, Kigali',
    phone: '+250788234567',
    location: { lat: -1.9500, lng: 30.0700 }, // Remera approximate
    whatsapp_verified: true,
    is_active: true,
  },
  {
    name: 'Hardware Store Kigali',
    category: 'hardware',
    address: 'Kimironko Market',
    phone: '+250788345678',
    location: { lat: -1.9300, lng: 30.0800 }, // Kimironko approximate
    whatsapp_verified: false,
    is_active: true,
  },
  {
    name: 'Restaurant Le Bon',
    category: 'restaurant',
    address: 'Nyarutarama, Kigali',
    phone: '+250788456789',
    location: { lat: -1.9200, lng: 30.0900 }, // Nyarutarama approximate
    whatsapp_verified: true,
    is_active: true,
  },
  {
    name: 'Supermarket Quick',
    category: 'supermarket',
    address: 'Gikondo, Kigali',
    phone: '+250788567890',
    location: { lat: -1.9600, lng: 30.0500 }, // Gikondo approximate
    whatsapp_verified: false,
    is_active: true,
  },
];

async function populateBusinesses() {
  console.log('Populating businesses table...\n');

  for (const business of sampleBusinesses) {
    try {
      // Check if business exists first
      const { data: existing } = await supabase
        .from('businesses')
        .select('id')
        .eq('phone', business.phone)
        .single();

      let data, error;
      
      if (existing) {
        // Update existing
        ({ data, error } = await supabase
          .from('businesses')
          .update({
            name: business.name,
            category: business.category,
            address: business.address,
            location: `POINT(${business.location.lng} ${business.location.lat})`,
            whatsapp_verified: business.whatsapp_verified,
            is_active: business.is_active,
          })
          .eq('id', existing.id)
          .select('id, name')
          .single());
      } else {
        // Insert new
        ({ data, error } = await supabase
          .from('businesses')
          .insert({
            name: business.name,
            category: business.category,
            address: business.address,
            phone: business.phone,
            location: `POINT(${business.location.lng} ${business.location.lat})`,
            whatsapp_verified: business.whatsapp_verified,
            is_active: business.is_active,
          })
          .select('id, name')
          .single());
      }

      if (error) {
        console.error(`Failed to insert ${business.name}:`, error.message);
      } else {
        console.log(`✅ Inserted: ${business.name} (${data.id})`);
      }
    } catch (error: any) {
      console.error(`Error inserting ${business.name}:`, error.message);
    }
  }

  console.log('\n✅ Done!');
  
  // Count total businesses
  const { count } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Total businesses in database: ${count || 0}`);
}

populateBusinesses().catch(console.error);

