/**
 * Test Broadcast Flow End-to-End
 * 
 * This script tests the complete WhatsApp broadcast flow:
 * 1. Preview action - creates campaign and finds targets
 * 2. Start action - sends messages (or simulates in demo mode)
 * 3. Verifies database state
 * 
 * Run with: npx tsx scripts/test-broadcast-flow.ts
 * 
 * Requires:
 * - SUPABASE_URL environment variable
 * - SUPABASE_ANON_KEY environment variable (for Edge Function calls)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rghmxgutlbvzrfztxvaq.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnaG14Z3V0bGJ2enJmenR4dmFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NTU1MDcsImV4cCI6MjA4MTEzMTUwN30.ONdIMXYCppU53M869ENsePw3okULdbuaVv3qkKjiTiM';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnaG14Z3V0bGJ2enJmenR4dmFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTU1NTUwNywiZXhwIjoyMDgxMTMxNTEwN30._KkRyCVXNZ2DBG7o4v6r3wnxffav5s6-hU9y5VsD5xk';

// Use service role for all database queries (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const supabaseAdmin = supabase;

async function testBroadcastFlow() {
  console.log('🧪 Testing WhatsApp Broadcast Flow\n');
  console.log('=' .repeat(50));

  // Step 1: Check businesses
  console.log('\n1️⃣ Checking businesses...');
  const { data: businesses, error: bizError } = await supabase
    .from('businesses')
    .select('id, name, category, phone')
    .eq('is_active', true)
    .limit(5);

  if (bizError) {
    console.error('❌ Error fetching businesses:', bizError.message);
    return;
  }

  if (!businesses || businesses.length === 0) {
    console.error('❌ No businesses found. Run populate-businesses.ts first.');
    return;
  }

  console.log(`✅ Found ${businesses.length} businesses:`);
  businesses.forEach(b => {
    console.log(`   - ${b.name} (${b.category}) - ${b.phone}`);
  });

  // Step 2: Preview action
  console.log('\n2️⃣ Testing preview action...');
  const campaignId = `test-${Date.now()}`;
  
  const previewPayload = {
    campaign_id: campaignId,
    action: 'preview',
    need: 'paracetamol',
    location_label: 'Kigali',
    radius_km: 10,
    max_targets: 5,
    category: 'pharmacy',
  };

  console.log('   Payload:', JSON.stringify(previewPayload, null, 2));

  try {
    const previewResponse = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-broadcast`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(previewPayload),
    });

    const previewResult = await previewResponse.json();
    
    if (!previewResponse.ok) {
      console.error('❌ Preview failed:', previewResult);
      return;
    }

    console.log('✅ Preview successful:', previewResult);

    // Step 3: Verify broadcast created
    console.log('\n3️⃣ Verifying broadcast in database...');
    const { data: broadcast, error: broadcastError } = await supabase
      .from('broadcasts')
      .select('*')
      .eq('campaign_id', campaignId)
      .single();

    if (broadcastError || !broadcast) {
      console.error('❌ Broadcast not found:', broadcastError?.message);
      return;
    }

    console.log('✅ Broadcast found:');
    console.log(`   - ID: ${broadcast.id}`);
    console.log(`   - Campaign ID: ${broadcast.campaign_id}`);
    console.log(`   - Status: ${broadcast.status}`);
    console.log(`   - Need: ${broadcast.need_description}`);
    console.log(`   - Location: ${broadcast.location_label}`);

    // Step 4: Check if targets were created (if preview returned targets)
    if (previewResult.targets && previewResult.targets.length > 0) {
      console.log('\n4️⃣ Checking broadcast targets...');
      const { data: targets, error: targetsError } = await supabase
        .from('broadcast_targets')
        .select('*, businesses(name, phone)')
        .eq('campaign_id', broadcast.id);

      if (targetsError) {
        console.error('❌ Error fetching targets:', targetsError.message);
      } else if (targets && targets.length > 0) {
        console.log(`✅ Found ${targets.length} targets:`);
        targets.forEach((t: any) => {
          console.log(`   - ${t.businesses?.name || 'Unknown'} - Status: ${t.status}`);
        });
      } else {
        console.log('⚠️  No targets found (this is OK for preview mode)');
      }
    }

    // Step 5: Test start action (optional - only if you want to actually send)
    console.log('\n5️⃣ Testing start action (demo mode)...');
    console.log('   Note: This will simulate sending messages in demo mode');
    
    const startPayload = {
      campaign_id: campaignId,
      action: 'start',
      targets: businesses.slice(0, 2).map(b => ({ business_id: b.id })),
    };

    try {
      const startResponse = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-broadcast`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(startPayload),
      });

      const startResult = await startResponse.json();
      
      if (!startResponse.ok) {
        console.error('❌ Start failed:', startResult);
      } else {
        console.log('✅ Start successful:', startResult);
        
        // Check messages
        if (supabaseAdmin) {
          const { data: messages, error: msgError } = await supabaseAdmin
            .from('broadcast_messages')
            .select('*, businesses(name)')
            .eq('campaign_id', broadcast.id)
            .order('created_at', { ascending: false })
            .limit(5);

          if (!msgError && messages && messages.length > 0) {
            console.log(`\n✅ Found ${messages.length} messages logged:`);
            messages.forEach((m: any) => {
              console.log(`   - ${m.direction} to ${m.businesses?.name || 'Unknown'}: ${m.text?.substring(0, 50)}...`);
            });
          }
        }
      }
    } catch (error: any) {
      console.error('❌ Start action error:', error.message);
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Summary:');
    console.log(`   ✅ Campaign created: ${campaignId}`);
    console.log(`   ✅ Broadcast status: ${broadcast.status}`);
    console.log(`   ✅ Businesses available: ${businesses.length}`);
    console.log('\n✅ End-to-end flow test complete!');
    console.log('\n💡 Next steps:');
    console.log('   - Configure WhatsApp API credentials for real messages');
    console.log('   - Test with actual WhatsApp Business API');
    console.log('   - Set up webhook for inbound responses');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }
}

testBroadcastFlow().catch(console.error);

