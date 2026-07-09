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

  // Mese precedente
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const from = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  const to   = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  // ─── SINGOLI ────────────────────────────────────────────────────────────
  const { data: singLogs } = await supabase
    .from('logs')
    .select('user_id, hearts_delta')
    .gte('activity_date', from)
    .lte('activity_date', to);

  const singMap: Record<string, number> = {};
  for (const l of singLogs ?? []) {
    singMap[l.user_id] = (singMap[l.user_id] ?? 0) + (l.hearts_delta ?? 0);
  }
  const singPodium = Object.entries(singMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);

  // ─── TANDEM ──────────────────────────────────────────────────────────────
  const { data: tandems } = await supabase.from('tandems').select('id');
  const tandemScores: { id: string; score: number; memberIds: string[] }[] = [];
  for (const t of tandems ?? []) {
    const { data: members } = await supabase
      .from('profiles')
      .select('id')
      .eq('tandem_id', t.id);
    const ids = (members ?? []).map((m: any) => m.id);
    if (ids.length === 0) continue;
    const score = (singLogs ?? [])
      .filter((l) => ids.includes(l.user_id))
      .reduce((s, l) => s + (l.hearts_delta ?? 0), 0);
    tandemScores.push({ id: t.id, score, memberIds: ids });
  }
  tandemScores.sort((a, b) => b.score - a.score);
  const tandemPodium = tandemScores.slice(0, 3);

  // ─── CLAN ────────────────────────────────────────────────────────────────
  const { data: clans } = await supabase.from('clans').select('id');
  const clanScores: { id: string; score: number; memberIds: string[] }[] = [];
  for (const c of clans ?? []) {
    const { data: members } = await supabase
      .from('profiles')
      .select('id')
      .eq('clan_id', c.id);
    const ids = (members ?? []).map((m: any) => m.id);
    if (ids.length === 0) continue;
    const score = (singLogs ?? [])
      .filter((l) => ids.includes(l.user_id))
      .reduce((s, l) => s + (l.hearts_delta ?? 0), 0);
    clanScores.push({ id: c.id, score, memberIds: ids });
  }
  clanScores.sort((a, b) => b.score - a.score);
  const clanPodium = clanScores.slice(0, 3);

  // ─── Rank singoli completo (per best_monthly_rank) ───────────────────────
  const singRanked = Object.entries(singMap).sort((a, b) => b[1] - a[1]);
  const singRankMap: Record<string, number> = {};
  singRanked.forEach(([id], i) => { singRankMap[id] = i + 1; });

  // ─── Aggiorna rank_counts per ogni utente coinvolto ──────────────────────
  const allIds = [
    ...singPodium,
    ...tandemPodium.flatMap((t) => t.memberIds),
    ...clanPodium.flatMap((c) => c.memberIds),
  ];
  const uniqueIds = [...new Set(allIds)];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, rank_counts, best_monthly_rank')
    .in('id', uniqueIds);

  const profileMap: Record<string, any> = {};
  const bestRankMap: Record<string, number> = {};
  for (const p of profiles ?? []) {
    profileMap[p.id] = p.rank_counts ?? {};
    bestRankMap[p.id] = p.best_monthly_rank ?? 9999;
  }

  function inc(id: string, key: string) {
    if (!profileMap[id]) profileMap[id] = {};
    profileMap[id][key] = (profileMap[id][key] ?? 0) + 1;
  }

  // Singoli
  if (singPodium[0]) inc(singPodium[0], 'gs');
  if (singPodium[1]) inc(singPodium[1], 'ss');
  if (singPodium[2]) inc(singPodium[2], 'bs');

  // Tandem — tutti i membri del tandem ricevono la medaglia
  for (const [rank, t] of tandemPodium.entries()) {
    const key = rank === 0 ? 'gt' : rank === 1 ? 'st' : 'bt';
    for (const uid of t.memberIds) inc(uid, key);
  }

  // Clan
  for (const [rank, c] of clanPodium.entries()) {
    const key = rank === 0 ? 'gc' : rank === 1 ? 'sc' : 'bc';
    for (const uid of c.memberIds) inc(uid, key);
  }

  // Scrivi rank_counts + best_monthly_rank su DB
  for (const [id, counts] of Object.entries(profileMap)) {
    const thisMonthRank = singRankMap[id] ?? null;
    const currentBest = bestRankMap[id] ?? 9999;
    const newBest = thisMonthRank !== null && thisMonthRank < currentBest ? thisMonthRank : (currentBest < 9999 ? currentBest : null);
    await supabase.from('profiles').update({ rank_counts: counts, best_monthly_rank: newBest }).eq('id', id);
  }

  return new Response(JSON.stringify({
    month: from.slice(0, 7),
    singoli: singPodium,
    tandem: tandemPodium.map((t) => t.id),
    clan: clanPodium.map((c) => c.id),
    updated: uniqueIds.length,
  }), { status: 200 });
});
