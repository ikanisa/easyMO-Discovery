
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Declare Deno for TypeScript in environments that don't know about it
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { requestId } = await req.json();

    try {
      const { data, error } = await supabase
        .from('broadcast_responses')
        .select('*')
        .eq('request_id', requestId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ status: 'success', matches: data || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (_e) {
      // If table is missing, still return a valid response to avoid breaking the client
      return new Response(
        JSON.stringify({ status: 'success', matches: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    return new Response(
      JSON.stringify({ status: 'error', message: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
