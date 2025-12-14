require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');

const app = express();

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

app.post('/twilio/inbound', (req, res) => {
  const sigErr = requireValidTwilioSignature(req, res);
  if (sigErr) return;

  const messageSid = req.body.MessageSid;
  const from = req.body.From;
  const to = req.body.To;

  const body = (req.body.Body || '').trim();
  const buttonText = (req.body.ButtonText || '').toString().trim();
  const buttonPayload = (req.body.ButtonPayload || '').toString().trim();

  logEvent('inbound', { messageSid, from, to, body, buttonText, buttonPayload });

  // ✅ Vendor actions: treat as conversation event only (do NOT auto-reply)
  const vendorSignal = buttonText || body;
  if (isVendorQuickReply(vendorSignal)) {
    logEvent('vendor_action', { messageSid, from, action: vendorSignal });
    return res.type('text/xml').status(200).send('<Response/>');
  }

  // Buyer/user normal conversation (simple placeholder for now)
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(
    `Kwizera here ✅\n\nTell me:\n1) What item/service?\n2) Where are you? (type area or share location)\n3) Quantity / budget (optional)`
  );
  return res.type('text/xml').status(200).send(twiml.toString());
});

app.post('/twilio/status', (req, res) => {
  const sigErr = requireValidTwilioSignature(req, res);
  if (sigErr) return;

  logEvent('status', {
    messageSid: req.body.MessageSid,
    messageStatus: req.body.MessageStatus,
    from: req.body.From,
    to: req.body.To,
    errorCode: req.body.ErrorCode,
    errorMessage: req.body.ErrorMessage
  });

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

    logEvent('admin_send_template', { to, contentSid, variables, sid: msg.sid, status: msg.status });
    res.status(200).json({ sid: msg.sid, status: msg.status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'Unknown error' });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Webhook listening on port ${port}`));
