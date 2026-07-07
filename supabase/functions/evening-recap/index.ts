import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  const auth = req.headers.get('authorization');
  const secret = Deno.env.get('CRON_SECRET') ?? 'runcool_cron_2024_secret';
  if (auth !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();

  // Tutti i log di oggi (workout + drink) per calcolare cuori e missioni
  const { data: allLogs } = await supabase
    .from('logs')
    .select('user_id, type, item_id, hearts_delta')
    .gte('created_at', startOfDay);

  const workoutLogs = (allLogs ?? []).filter((l) => l.type === 'workout');

  if (workoutLogs.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: 'no activity today' }), { status: 200 });
  }

  // Cuori guadagnati oggi per utente (solo workout, hearts_delta positivo)
  const heartsByUser: Record<string, number> = {};
  workoutLogs.forEach((l) => {
    heartsByUser[l.user_id] = (heartsByUser[l.user_id] ?? 0) + (l.hearts_delta ?? 0);
  });

  // Username di chi si è allenato
  const activeUserIds = Object.keys(heartsByUser);
  const { data: actors } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', activeUserIds);

  const usernameMap: Record<string, string> = {};
  (actors ?? []).forEach((a) => { usernameMap[a.id] = a.username; });

  // Classifica cuori: "Andrea +12 ❤️ | Matteo +8 ❤️ | ..."
  const ranked = Object.entries(heartsByUser)
    .sort(([, a], [, b]) => b - a)
    .map(([uid, h]) => `${usernameMap[uid] ?? '???'} +${h} ❤️`);

  const recapBody = ranked.length > 3
    ? `${ranked.slice(0, 3).join(' | ')} e altri ${ranked.length - 3}...`
    : ranked.join(' | ');

  // Iscritti al recap serale (evening_recap + every_activity) — con o senza push token
  const { data: subs } = await supabase
    .from('profiles')
    .select('id, push_token')
    .in('notif_pref', ['evening_recap', 'every_activity']);

  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: 'no subscribers' }), { status: 200 });
  }

  const title = 'Cosa hanno fatto i maialini oggi? 🐷';
  const dbRows: { user_id: string; title: string; body: string }[] = [];
  const pushMessages: object[] = [];

  for (const sub of subs) {
    const userLogs = (allLogs ?? []).filter((l) => l.user_id === sub.id);
    const hasMentality = userLogs.some((l) => l.type === 'workout' && l.item_id === 'mentality');
    const hasDrunk = userLogs.some((l) => l.type === 'drink');

    const reminders: string[] = [];
    if (!hasMentality) reminders.push('🧠 Apri l\'app per mentality e focus... o grufoli nel fango?');
    if (!hasDrunk) reminders.push('😏 Non hai bevuto veramente?');

    const body = reminders.length > 0
      ? `${recapBody}\n\n${reminders.join(' · ')}`
      : recapBody;

    dbRows.push({ user_id: sub.id, title, body });

    if (sub.push_token) {
      pushMessages.push({ to: sub.push_token, title, body, sound: 'default' });
    }
  }

  // Salva nel DB per tutti
  await supabase.from('notifications').insert(dbRows);

  // Push solo a chi ha il token
  if (pushMessages.length > 0) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(pushMessages),
    });
  }

  return new Response(JSON.stringify({ sent: notifications.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
