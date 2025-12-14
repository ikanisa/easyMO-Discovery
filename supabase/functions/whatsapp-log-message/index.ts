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
      direction,
      from_number,
      to_number,
      body,
      button_text,
      button_payload,
      status,
      metadata 
    } = await req.json()

    if (!message_sid || !direction || !from_number || !to_number) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for duplicate
    const { data: existing } = await supabase
      .from('whatsapp_messages')
      .select('message_sid')
      .eq('message_sid', message_sid)
      .single()

    if (existing) {
      return new Response(
        JSON.stringify({ success: true, duplicate: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Insert message
    const { data: message, error: msgError } = await supabase
      .from('whatsapp_messages')
      .insert({
        message_sid,
        direction,
        from_number,
        to_number,
        body,
        button_text,
        button_payload,
        status: status || 'received',
        metadata,
        received_at: direction === 'inbound' ? new Date().toISOString() : null,
        sent_at: direction === 'outbound' ? new Date().toISOString() : null,
      })
      .select()
      .single()

    if (msgError) throw msgError

    // Update thread if inbound
    if (direction === 'inbound') {
      const { data: thread } = await supabase
        .from('whatsapp_threads')
        .select('*')
        .eq('phone_number', from_number)
        .single()

      if (thread) {
        await supabase
          .from('whatsapp_threads')
          .update({
            last_message_at: new Date().toISOString(),
            message_count: thread.message_count + 1,
            updated_at: new Date().toISOString()
          })
          .eq('phone_number', from_number)
      } else {
        await supabase
          .from('whatsapp_threads')
          .insert({
            phone_number: from_number,
            first_message_at: new Date().toISOString(),
            last_message_at: new Date().toISOString(),
            message_count: 1
          })
      }
    }

    return new Response(
      JSON.stringify({ success: true, message_id: message.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
