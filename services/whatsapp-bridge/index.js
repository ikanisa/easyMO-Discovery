require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Supabase client (service role for server-side access)
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://rghmxgutlbvzrfztxvaq.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Twilio webhooks are form-encoded by default
app.use(bodyParser.urlencoded({ extended: false }));
// Admin endpoints use JSON
app.use(bodyParser.json());

app.get('/health', (_req, res) => res.status(200).send('ok'));

function buildRequestUrl(req) {
  const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, '');
  if (base) return `${base}${req.originalUrl}`;

  const proto = (req.headers['x-forwarded-proto'] || 'https').toString();
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').toString();
  return `${proto}://${host}${req.originalUrl}`;
}

function requireValidTwilioSignature(req, res) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = req.headers['x-twilio-signature'];

  if (!authToken) return res.status(500).send('Missing TWILIO_AUTH_TOKEN');
  if (!signature) return res.status(403).send('Missing X-Twilio-Signature');

  const ok = twilio.validateRequest(authToken, signature, buildRequestUrl(req), req.body || {});
  if (!ok) return res.status(403).send('Invalid Twilio signature');

  return null;
}

function requireAdminKey(req, res) {
  const expected = process.env.ADMIN_API_KEY;
  const got = (req.headers['x-admin-api-key'] || '').toString();
  if (!expected) return res.status(500).send('Missing ADMIN_API_KEY');
  if (!got || got !== expected) return res.status(401).send('Unauthorized');
  return null;
}

function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid) throw new Error('Missing TWILIO_ACCOUNT_SID');
  if (!token) throw new Error('Missing TWILIO_AUTH_TOKEN');
  return twilio(sid, token);
}

function logEvent(type, payload) {
  console.log(JSON.stringify({ type, ts: new Date().toISOString(), ...payload }));
}

// Vendor quick replies from your template:
function isVendorQuickReply(text) {
  const t = (text || '').toUpperCase();
  return t.includes('HAVE IT') || t.includes('NO STOCK') || t.includes('STOP MESSAGES');
}

// === Supabase Logging Functions ===

async function logWebhookEvent(eventType, payload, messageSid = null) {
  try {
    const { error } = await supabase.from('whatsapp_webhook_events').insert({
      event_type: eventType,
      message_sid: messageSid,
      payload: payload,
      signature_valid: true,
      processed: false
    });
    if (error) console.error('Failed to log webhook event:', error);
  } catch (err) {
    console.error('Exception logging webhook event:', err);
  }
}

async function logInboundMessage(req) {
  const messageSid = req.body.MessageSid;
  const from = req.body.From;
  const to = req.body.To;
  const body = (req.body.Body || '').trim();
  const buttonText = (req.body.ButtonText || '').toString().trim();
  const buttonPayload = (req.body.ButtonPayload || '').toString().trim();

  try {
    // Check for duplicate (idempotency)
    const { data: existing } = await supabase
      .from('whatsapp_messages')
      .select('message_sid')
      .eq('message_sid', messageSid)
      .single();

    if (existing) {
      console.log('Duplicate message detected, skipping:', messageSid);
      return true; // Signal duplicate
    }

    // Log to messages table
    const { error: msgError } = await supabase.from('whatsapp_messages').insert({
      message_sid: messageSid,
      direction: 'inbound',
      from_number: from,
      to_number: to,
      body: body,
      button_text: buttonText,
      button_payload: buttonPayload,
      status: 'received',
      received_at: new Date().toISOString()
    });
    if (msgError) console.error('Failed to log inbound message:', msgError);

    // Update or create thread
    const { data: thread, error: threadSelectErr } = await supabase
      .from('whatsapp_threads')
      .select('*')
      .eq('phone_number', from)
      .single();

    if (threadSelectErr && threadSelectErr.code !== 'PGRST116') {
      console.error('Thread select error:', threadSelectErr);
    }

    if (thread) {
      // Update existing thread
      await supabase.from('whatsapp_threads')
        .update({
          last_message_at: new Date().toISOString(),
          message_count: thread.message_count + 1
        })
        .eq('phone_number', from);
    } else {
      // Create new thread
      await supabase.from('whatsapp_threads').insert({
        phone_number: from,
        first_message_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
        message_count: 1
      });
    }

    return false; // Not duplicate
  } catch (err) {
    console.error('Exception logging inbound message:', err);
    return false;
  }
}

async function logOutboundMessage(messageSid, from, to, body) {
  try {
    const { error } = await supabase.from('whatsapp_messages').insert({
      message_sid: messageSid,
      direction: 'outbound',
      from_number: from,
      to_number: to,
      body: body,
      status: 'queued',
      sent_at: new Date().toISOString()
    });
    if (error) console.error('Failed to log outbound message:', error);
  } catch (err) {
    console.error('Exception logging outbound message:', err);
  }
}

async function logVendorResponse(messageSid, from, action) {
  try {
    // Determine response type
    let responseType = null;
    const upper = action.toUpperCase();
    if (upper.includes('HAVE IT')) responseType = 'have_it';
    else if (upper.includes('NO STOCK')) responseType = 'no_stock';
    else if (upper.includes('STOP')) responseType = 'stop';

    // Try to find the most recent broadcasted lead
    const { data: recentLead } = await supabase
      .from('leads')
      .select('id')
      .eq('status', 'broadcasted')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentLead && responseType) {
      await supabase.from('vendor_responses').insert({
        lead_id: recentLead.id,
        vendor_phone: from,
        response_type: responseType,
        message_sid: messageSid,
        button_text: action
      });
    } else if (responseType) {
      // Log without lead (orphaned vendor response)
      await supabase.from('vendor_responses').insert({
        vendor_phone: from,
        response_type: responseType,
        message_sid: messageSid,
        button_text: action
      });
    }
  } catch (err) {
    console.error('Exception logging vendor response:', err);
  }
}

app.post('/twilio/inbound', async (req, res) => {
  const sigErr = requireValidTwilioSignature(req, res);
  if (sigErr) return;

  const messageSid = req.body.MessageSid;
  const from = req.body.From;
  const to = req.body.To;

  const body = (req.body.Body || '').trim();
  const buttonText = (req.body.ButtonText || '').toString().trim();
  const buttonPayload = (req.body.ButtonPayload || '').toString().trim();

  // Log to Supabase (async, don't block response)
  logWebhookEvent('inbound', req.body, messageSid);
  const isDuplicate = await logInboundMessage(req);
  
  logEvent('inbound', { messageSid, from, to, body, buttonText, buttonPayload });

  // If duplicate, skip processing
  if (isDuplicate) {
    return res.type('text/xml').status(200).send('<Response/>');
  }

  // ✅ Vendor actions: treat as conversation event only (do NOT auto-reply)
  const vendorSignal = buttonText || body;
  if (isVendorQuickReply(vendorSignal)) {
    logEvent('vendor_action', { messageSid, from, action: vendorSignal });
    logVendorResponse(messageSid, from, vendorSignal);
    return res.type('text/xml').status(200).send('<Response/>');
  }

  // Buyer/user normal conversation (simple placeholder for now)
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(
    `Kwizera here ✅\n\nTell me:\n1) What item/service?\n2) Where are you? (type area or share location)\n3) Quantity / budget (optional)`
  );
  return res.type('text/xml').status(200).send(twiml.toString());
});

app.post('/twilio/status', async (req, res) => {
  const sigErr = requireValidTwilioSignature(req, res);
  if (sigErr) return;

  const messageSid = req.body.MessageSid;
  const messageStatus = req.body.MessageStatus;
  const errorCode = req.body.ErrorCode;
  const errorMessage = req.body.ErrorMessage;

  logWebhookEvent('status', req.body, messageSid);
  logEvent('status', {
    messageSid,
    messageStatus,
    from: req.body.From,
    to: req.body.To,
    errorCode,
    errorMessage
  });

  // Update message status in Supabase
  try {
    const updateData = { status: messageStatus };
    
    if (messageStatus === 'delivered') updateData.delivered_at = new Date().toISOString();
    if (messageStatus === 'read') updateData.read_at = new Date().toISOString();
    if (errorCode) {
      updateData.error_code = errorCode;
      updateData.error_message = errorMessage;
    }

    await supabase.from('whatsapp_messages')
      .update(updateData)
      .eq('message_sid', messageSid);
  } catch (err) {
    console.error('Failed to update message status:', err);
  }

  res.status(200).send('ok');
});

// Admin: send template (vendor doorbell)
app.post('/admin/send-template', async (req, res) => {
  const adminErr = requireAdminKey(req, res);
  if (adminErr) return;

  const to = (req.body?.to || '').toString().trim();
  const contentSid = (req.body?.contentSid || process.env.TWILIO_CONTENT_SID_EASYMO_BUSINESS || '').toString().trim();
  const variables = req.body?.variables || {};

  if (!to.startsWith('whatsapp:')) return res.status(400).json({ error: 'to must start with whatsapp:' });
  if (!contentSid) return res.status(400).json({ error: 'contentSid is required' });

  try {
    const client = getTwilioClient();
    const from = process.env.TWILIO_WHATSAPP_FROM;

    const msg = await client.messages.create({
      from,
      to,
      contentSid,
      contentVariables: JSON.stringify(variables),
    });

    // Log webhook event
    logWebhookEvent('admin_send', { to, contentSid, variables }, msg.sid);
    logEvent('admin_send_template', { to, contentSid, variables, sid: msg.sid, status: msg.status });
    
    // Log outbound message
    logOutboundMessage(msg.sid, from, to, `[Template: ${contentSid}]`);

    res.status(200).json({ sid: msg.sid, status: msg.status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'Unknown error' });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Webhook listening on port ${port}`));
