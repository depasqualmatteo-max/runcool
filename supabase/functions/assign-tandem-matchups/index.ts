import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Ritorna la data di inizio e fine della settimana corrente (lunedì–domenica)
function getCurrentWeek(): { weekStart: string; weekEnd: string } {
  const now = new Date();
  const day = now.getUTCDay(); // 0=domenica, 1=lunedì...
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { weekStart: fmt(monday), weekEnd: fmt(sunday) };
}

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

Deno.serve(async (req) => {
  // Sicurezza: stesso CRON_SECRET usato dalle altre funzioni
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { weekStart, weekEnd } = getCurrentWeek();

  // Controlla se i matchup di questa settimana esistono già
  const { data: existing } = await supabase
    .from('tandem_matchups')
    .select('id')
    .eq('week_start', weekStart)
    .limit(1);

  if (existing && existing.length > 0) {
    return new Response(JSON.stringify({ message: 'Matchups già assegnati per questa settimana', weekStart }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Prendi tutti i tandem con almeno 2 membri attivi
  const { data: tandems } = await supabase
    .from('tandems')
    .select('id, name');

  if (!tandems || tandems.length < 2) {
    return new Response(JSON.stringify({ message: 'Meno di 2 tandem disponibili', count: tandems?.length ?? 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Filtra solo i tandem con almeno 1 membro
  const activeTandems = [];
  for (const t of tandems) {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('tandem_id', t.id);
    if ((count ?? 0) >= 1) activeTandems.push(t);
  }

  if (activeTandems.length < 2) {
    return new Response(JSON.stringify({ message: 'Meno di 2 tandem attivi', count: activeTandems.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Shuffle e accoppia a coppie
  const shuffled = shuffle(activeTandems);
  const matchups = [];
  for (let i = 0; i + 1 < shuffled.length; i += 2) {
    matchups.push({
      tandem1_id: shuffled[i].id,
      tandem2_id: shuffled[i + 1].id,
      week_start: weekStart,
      week_end: weekEnd,
    });
  }
  // Se dispari, l'ultimo tandem non ha matchup questa settimana

  // Inserisci nel DB
  const { error } = await supabase.from('tandem_matchups').insert(matchups);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  // Notifiche push ai partecipanti
  const notifications = [];
  for (let i = 0; i < matchups.length; i++) {
    const t1 = shuffled[i * 2];
    const t2 = shuffled[i * 2 + 1];

    const notifTitle = '⚔️ Nuova sfida tandem!';
    const notifBody = `${t1.name} vs ${t2.name} — chi vince questa settimana?`;

    // Prendi id + push token dei membri di entrambi i tandem
    const { data: members } = await supabase
      .from('profiles')
      .select('id, push_token')
      .in('tandem_id', [t1.id, t2.id])
      .not('push_token', 'is', null);

    for (const m of members ?? []) {
      notifications.push({ to: m.push_token, title: notifTitle, body: notifBody, sound: 'default' });
    }

    // Salva nel DB per lo storico (tutti i membri, anche senza push token)
    const { data: allMembers } = await supabase
      .from('profiles')
      .select('id')
      .in('tandem_id', [t1.id, t2.id]);
    if (allMembers && allMembers.length > 0) {
      await supabase.from('notifications').insert(
        allMembers.map((m: any) => ({ user_id: m.id, title: notifTitle, body: notifBody }))
      );
    }
  }

  if (notifications.length > 0) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(notifications),
    });
  }

  return new Response(
    JSON.stringify({
      created: matchups.length,
      weekStart,
      weekEnd,
      notified: notifications.length,
      bye: shuffled.length % 2 === 1 ? shuffled[shuffled.length - 1].name : null,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
