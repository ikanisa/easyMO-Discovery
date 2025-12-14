// Broadcast System
// Sends WhatsApp templates to multiple vendors

async function broadcastToVendors(twilioClient, supabase, leadId, vendors) {
  try {
    // Get lead details
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      throw new Error('Lead not found');
    }

    const from = process.env.TWILIO_WHATSAPP_FROM;
    const contentSid = process.env.TWILIO_CONTENT_SID_EASYMO_BUSINESS;

    if (!contentSid) {
      throw new Error('TWILIO_CONTENT_SID_EASYMO_BUSINESS not configured');
    }

    const results = [];
    let successCount = 0;

    // Send to each vendor
    for (const vendor of vendors) {
      try {
        const message = await twilioClient.messages.create({
          from,
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
            total_broadcasts_received: vendor.total_broadcasts_received + 1,
            last_broadcast_at: new Date().toISOString()
          })
          .eq('id', vendor.id);

      } catch (error) {
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

    return {
      success: true,
      total: vendors.length,
      sent: successCount,
      failed: vendors.length - successCount,
      results
    };

  } catch (error) {
    console.error('Broadcast error:', error);
    throw error;
  }
}

module.exports = { broadcastToVendors };
