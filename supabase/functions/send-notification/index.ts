import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ADMIN_EMAIL = 'de.pasqual.matteo@gmail.com';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  // Verifica JWT utente
  const jwt = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!jwt) return new Response('Unauthorized', { status: 401 });

  const { data: { user }, error } = await supabase.auth.getUser(jwt);
  if (error || !user || user.email !== ADMIN_EMAIL) {
    return new Response('Forbidden', { status: 403 });
  }

  const { title, body, target } = await req.json();
  if (!title || !body) return new Response('Missing title or body', { status: 400 });

  // Prendi push token degli utenti target
  let query = supabase.from('profiles').select('push_token').not('push_token', 'is', null);
  if (target && target !== 'all') {
    query = query.eq('clan_id', target);
  }
  const { data: profiles } = await query;

  if (!profiles || profiles.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { headers: { 'Content-Type': 'application/json' } });
  }

  const notifications = profiles.map((p) => ({
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

  return new Response(JSON.stringify({ sent: notifications.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
