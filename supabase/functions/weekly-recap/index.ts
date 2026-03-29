import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  // Sicurezza: accetta solo richieste con il token corretto
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Prendi tutti gli utenti con push token
  const { data: users } = await supabase
    .from('profiles')
    .select('id, username, hearts, push_token, clan_id')
    .not('push_token', 'is', null);

  if (!users || users.length === 0) {
    return new Response('No users', { status: 200 });
  }

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const notifications = [];

  for (const user of users) {
    // Statistiche settimanali
    const { data: logs } = await supabase
      .from('logs')
      .select('type, hearts_delta')
      .eq('user_id', user.id)
      .gte('created_at', oneWeekAgo);

    const drinks = (logs ?? []).filter((l) => l.type === 'drink').length;
    const heartsGained = (logs ?? [])
      .filter((l) => l.type === 'workout')
      .reduce((s, l) => s + (l.hearts_delta || 0), 0);
    const heartsLost = Math.abs(
      (logs ?? []).filter((l) => l.type === 'drink').reduce((s, l) => s + (l.hearts_delta || 0), 0),
    );

    // Leader del clan
    let clanLine = '';
    if (user.clan_id) {
      const { data: members } = await supabase
        .from('profiles')
        .select('username, hearts')
        .eq('clan_id', user.clan_id)
        .order('hearts', { ascending: false })
        .limit(1);
      if (members && members.length > 0) {
        clanLine = ` | 🏆 ${members[0].username} guida il clan`;
      }
    }

    notifications.push({
      to: user.push_token,
      title: 'RunCool — Recap lunedì 🐷',
      body: `Settimana scorsa: ${drinks} drink 🍺 | +${heartsGained} ❤️ | -${heartsLost} ❤️${clanLine}`,
      sound: 'default',
    });
  }

  // Manda tutte le notifiche in batch
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(notifications),
  });

  return new Response(JSON.stringify({ sent: notifications.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
