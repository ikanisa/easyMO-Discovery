import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ status: 'error', error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const body = await req.json();
    const event_type = typeof body?.event_type === 'string' ? body.event_type : 'event';
    const phone = typeof body?.phone === 'string' ? body.phone : null;
    const need = typeof body?.need === 'string' ? body.need : null;
    const location = typeof body?.location === 'string' ? body.location : null;
    const metadata = body?.metadata && typeof body.metadata === 'object' ? body.metadata : null;

    const { error } = await supabase.from('request_logs').insert({
      user_id: user.id,
      event_type,
      phone,
      need,
      location,
      metadata,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ status: 'success' }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error: any) {
    console.error('Log Request Error:', error);
    return new Response(JSON.stringify({ status: 'error', error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});

