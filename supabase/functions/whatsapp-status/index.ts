import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      } 
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader?.replace('Bearer ', '') || ''
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ status: 'error', error: 'Unauthorized' }),
        { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const { leadId } = await req.json();

    if (!leadId) {
      throw new Error('leadId required');
    }

    // Get lead info
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      throw new Error('Lead not found');
    }

    // Get all vendor responses for this lead
    const { data: messages, error: messagesError } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('lead_id', leadId)
      .eq('direction', 'inbound')
      .order('created_at', { ascending: false });

    if (messagesError) {
      throw messagesError;
    }

    // Count responses by type
    const responses = {
      have_it: 0,
      no_stock: 0,
      stop_messages: 0,
      other: 0,
      total: messages?.length || 0
    };

    messages?.forEach(msg => {
      const body = (msg.body || '').toUpperCase();
      if (body.includes('HAVE IT')) {
        responses.have_it++;
      } else if (body.includes('NO STOCK')) {
        responses.no_stock++;
      } else if (body.includes('STOP MESSAGES')) {
        responses.stop_messages++;
      } else {
        responses.other++;
      }
    });

    return new Response(
      JSON.stringify({
        status: 'success',
        lead: {
          id: lead.id,
          status: lead.status,
          broadcast_count: lead.broadcast_count,
          vendor_count: lead.vendor_count,
          broadcast_sent_at: lead.broadcast_sent_at
        },
        responses,
        messages: messages || []
      }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (error: any) {
    console.error('Status Check Error:', error);
    return new Response(
      JSON.stringify({ status: 'error', error: error.message }),
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
});
