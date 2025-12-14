import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { 
      lead_id,
      from_state,
      to_state,
      reason,
      metadata 
    } = await req.json()

    if (!lead_id || !to_state) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update lead status
    const { error: leadError } = await supabase
      .from('leads')
      .update({ 
        status: to_state,
        updated_at: new Date().toISOString()
      })
      .eq('id', lead_id)

    if (leadError) throw leadError

    // Log state change event
    const { error: eventError } = await supabase
      .from('lead_state_events')
      .insert({
        lead_id,
        from_state,
        to_state,
        reason,
        metadata
      })

    if (eventError) throw eventError

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
