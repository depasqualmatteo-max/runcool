import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ADMIN_EMAIL = 'de.pasqual.matteo@gmail.com';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    // Verifica JWT utente usando il service role client
    const jwt = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'No token' }), { status: 401, headers: corsHeaders });
    }

    // getUser con JWT passato direttamente
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Auth failed', detail: authError?.message }),
        { status: 401, headers: corsHeaders },
      );
    }

    if (user.email !== ADMIN_EMAIL) {
      return new Response(
        JSON.stringify({ error: 'Not admin', email: user.email }),
        { status: 403, headers: corsHeaders },
      );
    }

    const { title, body, target } = await req.json();
    if (!title || !body) {
      return new Response(JSON.stringify({ error: 'Missing title or body' }), { status: 400, headers: corsHeaders });
    }

    // Prendi push token degli utenti target
    let query = supabase.from('profiles').select('push_token').not('push_token', 'is', null);
    if (target && target !== 'all') {
      query = query.eq('clan_id', target);
    }
    const { data: profiles, error: dbError } = await query;

    if (dbError) {
      return new Response(JSON.stringify({ error: 'DB error', detail: dbError.message }), { status: 500, headers: corsHeaders });
    }

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: corsHeaders });
    }

    const notifications = profiles.map((p: any) => ({
      to: p.push_token,
      title,
      body,
      sound: 'default',
    }));

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(notifications),
    });

    return new Response(JSON.stringify({ sent: notifications.length }), { headers: corsHeaders });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
