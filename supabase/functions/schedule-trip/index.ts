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

    const { date, time, recurrence, origin, destination, coords, notes, role, vehicleType } = await req.json();

    const { data, error } = await supabase
      .from('scheduled_trips')
      .insert({
        user_id: user.id,
        role: role || 'passenger',
        date,
        time,
        recurrence: recurrence || 'none',
        origin_text: origin,
        origin_lat: coords?.origin?.lat,
        origin_lng: coords?.origin?.lng,
        destination_text: destination,
        destination_lat: coords?.dest?.lat,
        destination_lng: coords?.dest?.lng,
        vehicle_type: vehicleType,
        notes,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ status: 'success', trip: data }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (error: any) {
    console.error('Schedule Trip Error:', error);
    return new Response(
      JSON.stringify({ status: 'error', error: error.message }),
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
});
