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

    const { 
      campaign_id, 
      request_id, // Backward compatibility
      user_id,
      thread_id,
      need_description, 
      need, // New field name
      userLocationLabel, 
      location_label, // Backward compatibility
      category,
      radius_km,
      max_targets,
      businesses, 
      targets, // New: array of { business_id, ... }
      action 
    } = await req.json();

    // Use campaign_id or generate from request_id
    const finalCampaignId = campaign_id || request_id;
    if (!finalCampaignId) {
      throw new Error('campaign_id or request_id is required');
    }

    // 1. Create or update broadcast campaign
    try {
      const broadcastData: any = {
        campaign_id: finalCampaignId,
        request_id: finalCampaignId, // Keep for backward compatibility
        need_description: need_description || need,
        location_label: location_label || userLocationLabel,
        target_count: (targets || businesses)?.length || 0,
        status: action === 'preview' ? 'preview' : 'queued',
      };

      // Add new fields if provided
      if (user_id) broadcastData.user_id = user_id;
      if (thread_id) broadcastData.thread_id = thread_id;
      if (category) broadcastData.category = category;
      if (radius_km) broadcastData.radius_km = radius_km;
      if (max_targets) broadcastData.max_targets = max_targets;

      const { data: broadcast, error: dbError } = await supabase
        .from('broadcasts')
        .upsert(broadcastData, { 
          onConflict: 'campaign_id',
          ignoreDuplicates: false 
        })
        .select('id, campaign_id')
        .single();

      if (dbError) throw dbError;

      // 2. Insert broadcast targets (if targets array provided)
      if (targets && Array.isArray(targets) && targets.length > 0) {
        const targetInserts = targets.map((t: any) => ({
          campaign_id: broadcast.id, // Use UUID from broadcasts table
          business_id: t.business_id || t.id,
          status: 'pending',
        }));

        const { error: targetsError } = await supabase
          .from('broadcast_targets')
          .upsert(targetInserts, {
            onConflict: 'campaign_id,business_id',
            ignoreDuplicates: false,
          });

        if (targetsError) {
          console.warn('Failed to insert broadcast targets:', targetsError);
          // Continue - targets might already exist
        }
      }

      // 3. Integration with Meta WhatsApp API
      const metaToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
      const phoneId = Deno.env.get('WHATSAPP_PHONE_ID');

      if (metaToken && phoneId && action === 'start' && (targets || businesses)?.length > 0) {
        // Update broadcast status
        await supabase
          .from('broadcasts')
          .update({ status: 'sending' })
          .eq('id', broadcast.id);

        // Send WhatsApp messages to each target
        const businessesToContact = targets || businesses;
        
        for (const biz of businessesToContact) {
          const businessId = biz.business_id || biz.id;
          const phone = biz.phone || biz.business_phone;
          
          if (!phone) {
            console.warn(`Skipping business ${businessId}: no phone number`);
            continue;
          }

          try {
            // Send WhatsApp message via Meta API
            const messageResponse = await fetch(
              `https://graph.facebook.com/v18.0/${phoneId}/messages`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${metaToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  messaging_product: 'whatsapp',
                  to: phone,
                  type: 'template',
                  template: {
                    name: 'stock_inquiry',
                    language: { code: 'en' },
                    components: [{
                      type: 'body',
                      parameters: [{
                        type: 'text',
                        text: need_description || need || 'inquiry',
                      }],
                    }],
                  },
                }),
              }
            );

            const messageData = await messageResponse.json();
            const waMessageId = messageData.messages?.[0]?.id;

            // Update broadcast_targets status
            if (businessId && waMessageId) {
              await supabase
                .from('broadcast_targets')
                .update({
                  status: 'sent',
                  wa_message_id: waMessageId,
                  last_event_at: new Date().toISOString(),
                })
                .eq('campaign_id', broadcast.id)
                .eq('business_id', businessId);

              // Insert into broadcast_messages (outbound)
              await supabase
                .from('broadcast_messages')
                .insert({
                  campaign_id: broadcast.id,
                  business_id: businessId,
                  direction: 'outbound',
                  wa_message_id: waMessageId,
                  text: need_description || need,
                  raw_payload: messageData,
                });
            }
          } catch (error: any) {
            console.error(`Failed to send WhatsApp to ${phone}:`, error);
            
            // Mark target as failed
            if (businessId) {
              await supabase
                .from('broadcast_targets')
                .update({
                  status: 'failed',
                  error: error.message || 'Failed to send message',
                  last_event_at: new Date().toISOString(),
                })
                .eq('campaign_id', broadcast.id)
                .eq('business_id', businessId);
            }
          }
        }

        // Update broadcast status to completed
        await supabase
          .from('broadcasts')
          .update({ status: 'completed' })
          .eq('id', broadcast.id);
      }

      // 4. Auto-Simulate Responses (Demo Mode - remove in production)
      if (action !== 'start' && (targets || businesses)?.length > 0) {
        const responders = (targets || businesses).slice(0, Math.min(2, (targets || businesses).length));
        
        for (const biz of responders) {
          try {
            const businessId = biz.business_id || biz.id;
            const businessName = biz.name || biz.business_name;
            const businessPhone = biz.phone || biz.business_phone;

            // Find target_id if exists
            let targetId = null;
            if (businessId) {
              const { data: target } = await supabase
                .from('broadcast_targets')
                .select('id')
                .eq('campaign_id', broadcast.id)
                .eq('business_id', businessId)
                .single();
              targetId = target?.id;
            }

            await supabase.from('broadcast_responses').insert({
              campaign_id: broadcast.id,
              request_id: finalCampaignId, // Keep for backward compatibility
              target_id: targetId,
              business_id: businessId,
              business_name: businessName,
              business_phone: businessPhone,
              item_found: 'Available',
              text: 'Yes, we have it in stock',
              response_type: 'available',
            });

            // Update target status to replied
            if (targetId) {
              await supabase
                .from('broadcast_targets')
                .update({
                  status: 'replied',
                  last_event_at: new Date().toISOString(),
                })
                .eq('id', targetId);
            }
          } catch (_insertErr) {
            // swallow if table missing or other error
            console.warn('Failed to insert demo response:', _insertErr);
          }
        }
      }

      return new Response(
        JSON.stringify({ 
          status: 'success', 
          message: action === 'preview' ? 'Targets previewed' : 'Broadcast queued',
          campaign_id: finalCampaignId,
          broadcast_id: broadcast.id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error: any) {
      console.error('Broadcast Error:', error);
      return new Response(
        JSON.stringify({ status: 'error', message: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Request Error:', error);
    return new Response(
      JSON.stringify({ status: 'error', message: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
