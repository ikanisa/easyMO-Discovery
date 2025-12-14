import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Twilio from 'npm:twilio@5.3.5';

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

    const { leadId, vendors } = await req.json();

    if (!leadId || !vendors || vendors.length === 0) {
      throw new Error('leadId and vendors array required');
    }

    // Initialize Twilio
    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioFrom = Deno.env.get('TWILIO_WHATSAPP_FROM');
    const contentSid = Deno.env.get('TWILIO_CONTENT_SID_EASYMO_BUSINESS');

    if (!twilioSid || !twilioToken || !twilioFrom || !contentSid) {
      throw new Error('Twilio credentials not configured');
    }

    const twilioClient = Twilio(twilioSid, twilioToken);

    // Get lead details
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      throw new Error('Lead not found');
    }

    const results = [];
    let successCount = 0;

    // Send to each vendor
    for (const vendor of vendors) {
      try {
        const message = await twilioClient.messages.create({
          from: twilioFrom,
          to: vendor.phone_number,
          contentSid,
          contentVariables: JSON.stringify({
            item: lead.item_requested,
            location: lead.location_text || 'Rwanda',
            quantity: lead.quantity || 'Not specified',
            budget: lead.budget || 'Open to offers'
          })
        });

        results.push({
          vendor_id: vendor.id,
          phone: vendor.phone_number,
          status: 'sent',
          message_sid: message.sid
        });

        successCount++;

        // Update vendor broadcast count
        await supabase
          .from('vendors')
          .update({
            total_broadcasts_received: (vendor.total_broadcasts_received || 0) + 1,
            last_broadcast_at: new Date().toISOString()
          })
          .eq('id', vendor.id);

      } catch (error: any) {
        console.error(`Failed to send to ${vendor.phone_number}:`, error);
        results.push({
          vendor_id: vendor.id,
          phone: vendor.phone_number,
          status: 'failed',
          error: error.message
        });
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Update lead with broadcast info
    await supabase
      .from('leads')
      .update({
        status: 'broadcasted',
        broadcast_count: successCount,
        vendor_count: vendors.length,
        broadcast_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    // Log state change
    await supabase
      .from('lead_state_events')
      .insert({
        lead_id: leadId,
        from_state: lead.status,
        to_state: 'broadcasted',
        reason: 'broadcast_sent_to_vendors',
        metadata: {
          vendor_count: vendors.length,
          success_count: successCount,
          results: results
        }
      });

    return new Response(
      JSON.stringify({
        status: 'success',
        total: vendors.length,
        sent: successCount,
        failed: vendors.length - successCount,
        results
      }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (error: any) {
    console.error('Broadcast Error:', error);
    return new Response(
      JSON.stringify({ status: 'error', error: error.message }),
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
});
