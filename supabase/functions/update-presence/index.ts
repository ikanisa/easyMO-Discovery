import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
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

    const { role, location, vehicleType, isOnline } = await req.json();

    // Convert to PostGIS format
    const locationPoint = `POINT(${location.lng} ${location.lat})`;

    const { error } = await supabase
      .from('presence')
      .upsert({
        user_id: user.id,
        role,
        vehicle_type: vehicleType || 'other',
        location: locationPoint,
        is_online: isOnline,
        last_seen: new Date().toISOString(),
      });

    if (error) throw error;

    return new Response(
      JSON.stringify({ status: 'success' }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (error: any) {
    console.error('Update Presence Error:', error);
    return new Response(
      JSON.stringify({ status: 'error', error: error.message }),
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
});
