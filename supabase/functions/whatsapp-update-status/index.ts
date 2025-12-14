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
      message_sid,
      status,
      delivered_at,
      read_at,
      error_code,
      error_message 
    } = await req.json()

    if (!message_sid || !status) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const updateData: any = { status }
    
    if (status === 'delivered' && delivered_at) {
      updateData.delivered_at = delivered_at
    }
    if (status === 'read' && read_at) {
      updateData.read_at = read_at
    }
    if (error_code) {
      updateData.error_code = error_code
      updateData.error_message = error_message
    }

    const { error } = await supabase
      .from('whatsapp_messages')
      .update(updateData)
      .eq('message_sid', message_sid)

    if (error) throw error

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
