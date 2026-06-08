import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Recap serale: riepilogo delle attività fisiche svolte da TUTTI gli utenti nella giornata
// (in futuro filtrabile per "amici" — per ora invia a tutti gli iscritti a notif_pref = 'evening_recap')
Deno.serve(async (req) => {
  // Sicurezza: accetta solo richieste con il token corretto (chiamata da cron esterno tipo cron-job.org)
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Inizio/fine della giornata corrente (UTC — adattare se serve fuso orario specifico)
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();

  // Tutte le attività sportive (workout) loggate oggi da TUTTI gli utenti
  const { data: workoutLogs } = await supabase
    .from('logs')
    .select('user_id, item_name, type')
    .eq('type', 'workout')
    .gte('created_at', startOfDay);

  if (!workoutLogs || workoutLogs.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: 'no activity today' }), { status: 200 });
  }

  // Prendi gli username degli autori
  const userIds = [...new Set(workoutLogs.map((l) => l.user_id))];
  const { data: actors } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', userIds);

  const usernameMap: Record<string, string> = {};
  (actors ?? []).forEach((a) => { usernameMap[a.id] = a.username; });

  // Conta attività per utente (es. "Matteo: Corsa ×2, Palestra ×1")
  const byUser: Record<string, Record<string, number>> = {};
  workoutLogs.forEach((l) => {
    const uname = usernameMap[l.user_id] ?? '???';
    byUser[uname] = byUser[uname] ?? {};
    byUser[uname][l.item_name] = (byUser[uname][l.item_name] ?? 0) + 1;
  });

  const lines = Object.entries(byUser).map(([uname, items]) => {
    const itemsStr = Object.entries(items).map(([name, count]) => count > 1 ? `${name} ×${count}` : name).join(', ');
    return `${uname}: ${itemsStr}`;
  });

  const recapBody = lines.length > 3
    ? `${lines.slice(0, 3).join(' | ')} e altri ${lines.length - 3}...`
    : lines.join(' | ');

  // Iscritti al recap serale
  const { data: subs } = await supabase
    .from('profiles')
    .select('id, push_token')
    .eq('notif_pref', 'evening_recap')
    .not('push_token', 'is', null);

  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: 'no subscribers' }), { status: 200 });
  }

  const notifications = subs.map((s) => ({
    to: s.push_token,
    title: 'RunCool — Recap della giornata 🌙',
    body: `Oggi si sono allenati: ${recapBody}`,
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
