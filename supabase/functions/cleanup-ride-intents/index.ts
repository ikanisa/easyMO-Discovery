/**
 * Supabase Edge Function: Cleanup Ride Intents
 * Scheduled function to expire stale ride intents
 * 
 * Setup:
 * 1. Deploy: supabase functions deploy cleanup-ride-intents
 * 2. Schedule via Supabase Dashboard or CLI:
 *    supabase functions schedule cleanup-ride-intents --cron "every 5 minutes"
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Call cleanup function
    const { data: count, error } = await supabase.rpc('expire_stale_ride_intents');
    
    if (error) {
      console.error('Cleanup error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        expired_count: count,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

