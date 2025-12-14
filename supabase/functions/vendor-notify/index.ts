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
      vendor_phone,
      response_type,
      message_sid,
      button_text 
    } = await req.json()

    if (!vendor_phone || !response_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log vendor response
    const { error } = await supabase
      .from('vendor_responses')
      .insert({
        lead_id,
        vendor_phone,
        response_type,
        message_sid,
        button_text
      })

    if (error) throw error

    // If vendor said "have_it", update lead quote count
    if (lead_id && response_type === 'have_it') {
      const { data: lead } = await supabase
        .from('leads')
        .select('quote_count')
        .eq('id', lead_id)
        .single()

      if (lead) {
        await supabase
          .from('leads')
          .update({ 
            quote_count: lead.quote_count + 1,
            status: 'quoted',
            updated_at: new Date().toISOString()
          })
          .eq('id', lead_id)
      }
    }

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
