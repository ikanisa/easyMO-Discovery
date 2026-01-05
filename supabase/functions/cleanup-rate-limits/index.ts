/**
 * Supabase Edge Function: Cleanup Rate Limits
 * Scheduled function to clean old rate limit entries
 * 
 * Setup:
 * 1. Deploy: supabase functions deploy cleanup-rate-limits
 * 2. Schedule via Supabase Dashboard or CLI:
 *    supabase functions schedule cleanup-rate-limits --cron "every hour"
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Call cleanup function
    const { data: count, error } = await supabase.rpc('cleanup_rate_limits');
    
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
        cleaned_count: count,
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

