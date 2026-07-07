import { supabase } from './supabase';
import { eachDayOfInterval, format } from 'date-fns';

export type MissionCategory = 'corsa' | 'attivita' | 'camminata' | 'no_drink' | 'mentality';

export interface MissionDef {
  category: MissionCategory;
  tokens: 1 | 2 | 3 | 4;
  emoji: string;
  label: string;
  target: number;
  targetKm?: number;
  targetElevation?: number;
}

export interface MissionProgress {
  value: number;
  pct: number;
  displayValue: string;
  completed: boolean;
  memberValues?: { id: string; value: number }[];
}

// ─── POOLS ───────────────────────────────────────────────────────────────────

const TANDEM_POOL: Record<MissionCategory, MissionDef[]> = {
  corsa: [
    { category: 'corsa', tokens: 1, emoji: '🏃', label: 'Percorrete insieme 20 km di corsa', target: 20 },
    { category: 'corsa', tokens: 2, emoji: '🏃', label: 'Percorrete insieme 30 km di corsa', target: 30 },
    { category: 'corsa', tokens: 3, emoji: '🏃', label: 'Percorrete insieme 40 km di corsa', target: 40 },
    { category: 'corsa', tokens: 4, emoji: '🏃', label: 'Percorrete insieme 50 km di corsa', target: 50 },
  ],
  attivita: [
    { category: 'attivita', tokens: 1, emoji: '💪', label: 'Accumulate 3h di attività in coppia', target: 180 },
    { category: 'attivita', tokens: 2, emoji: '💪', label: 'Accumulate 4h di attività in coppia', target: 240 },
    { category: 'attivita', tokens: 3, emoji: '💪', label: 'Accumulate 5h di attività in coppia', target: 300 },
    { category: 'attivita', tokens: 4, emoji: '💪', label: 'Accumulate 7h di attività in coppia', target: 420 },
  ],
  camminata: [
    { category: 'camminata', tokens: 1, emoji: '🚶', label: 'Camminate 15 km o 500 m D+', target: 15, targetKm: 15, targetElevation: 500 },
    { category: 'camminata', tokens: 2, emoji: '🚶', label: 'Camminate 20 km o 800 m D+', target: 20, targetKm: 20, targetElevation: 800 },
    { category: 'camminata', tokens: 3, emoji: '🚶', label: 'Camminate 25 km o 1000 m D+', target: 25, targetKm: 25, targetElevation: 1000 },
    { category: 'camminata', tokens: 4, emoji: '🚶', label: 'Camminate 30 km o 1400 m D+', target: 30, targetKm: 30, targetElevation: 1400 },
  ],
  no_drink: [
    { category: 'no_drink', tokens: 1, emoji: '🚫', label: 'Niente alcol per 6 giorni su 14', target: 6 },
    { category: 'no_drink', tokens: 2, emoji: '🚫', label: 'Niente alcol per 8 giorni su 14', target: 8 },
    { category: 'no_drink', tokens: 3, emoji: '🚫', label: 'Niente alcol per 10 giorni su 14', target: 10 },
    { category: 'no_drink', tokens: 4, emoji: '🚫', label: 'Niente alcol per 13 giorni su 14', target: 13 },
  ],
  mentality: [
    { category: 'mentality', tokens: 1, emoji: '🧠', label: "Aprite l'app per 9 giorni su 14", target: 9 },
    { category: 'mentality', tokens: 2, emoji: '🧠', label: "Aprite l'app per 11 giorni su 14", target: 11 },
    { category: 'mentality', tokens: 3, emoji: '🧠', label: "Aprite l'app per 13 giorni su 14", target: 13 },
  ],
};

const CLAN_POOL: Record<MissionCategory, MissionDef[]> = {
  corsa: [
    { category: 'corsa', tokens: 1, emoji: '🏃', label: '40 km di corsa a testa nel mese', target: 40 },
    { category: 'corsa', tokens: 2, emoji: '🏃', label: '60 km di corsa a testa nel mese', target: 60 },
    { category: 'corsa', tokens: 3, emoji: '🏃', label: '80 km di corsa a testa nel mese', target: 80 },
    { category: 'corsa', tokens: 4, emoji: '🏃', label: '100 km di corsa a testa nel mese', target: 100 },
  ],
  attivita: [
    { category: 'attivita', tokens: 1, emoji: '💪', label: '6h di attività a testa nel mese', target: 360 },
    { category: 'attivita', tokens: 2, emoji: '💪', label: '8h di attività a testa nel mese', target: 480 },
    { category: 'attivita', tokens: 3, emoji: '💪', label: '10h di attività a testa nel mese', target: 600 },
    { category: 'attivita', tokens: 4, emoji: '💪', label: '14h di attività a testa nel mese', target: 840 },
  ],
  camminata: [
    { category: 'camminata', tokens: 1, emoji: '🚶', label: '30 km a persona o 1000 m D+', target: 30, targetKm: 30, targetElevation: 1000 },
    { category: 'camminata', tokens: 2, emoji: '🚶', label: '40 km a persona o 1600 m D+', target: 40, targetKm: 40, targetElevation: 1600 },
    { category: 'camminata', tokens: 3, emoji: '🚶', label: '50 km a persona o 2000 m D+', target: 50, targetKm: 50, targetElevation: 2000 },
    { category: 'camminata', tokens: 4, emoji: '🚶', label: '60 km a persona o 2800 m D+', target: 60, targetKm: 60, targetElevation: 2800 },
  ],
  no_drink: [
    { category: 'no_drink', tokens: 1, emoji: '🚫', label: 'Ogni membro non beve per 12 giorni', target: 12 },
    { category: 'no_drink', tokens: 2, emoji: '🚫', label: 'Ogni membro non beve per 16 giorni', target: 16 },
    { category: 'no_drink', tokens: 3, emoji: '🚫', label: 'Ogni membro non beve per 20 giorni', target: 20 },
    { category: 'no_drink', tokens: 4, emoji: '🚫', label: 'Ogni membro non beve per 26 giorni', target: 26 },
  ],
  mentality: [
    { category: 'mentality', tokens: 1, emoji: '🧠', label: "L'80% dei Mentality del clan", target: 80 },
    { category: 'mentality', tokens: 2, emoji: '🧠', label: "L'85% dei Mentality del clan", target: 85 },
    { category: 'mentality', tokens: 3, emoji: '🧠', label: "Il 90% dei Mentality del clan", target: 90 },
  ],
};

// ─── SEEDED RANDOM ────────────────────────────────────────────────────────────

function seededRand(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return () => {
    h = (Math.imul(1664525, h) + 1013904223) | 0;
    return (h >>> 0) / 0xffffffff;
  };
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

// ─── GENERATION ───────────────────────────────────────────────────────────────
// Missioni generate deterministicamente dalla data: stesse per tutti nella stessa settimana/mese.

function generateMissions(pool: Record<MissionCategory, MissionDef[]>, seed: string): MissionDef[] {
  const rand = seededRand(seed);

  // Slot 1: sempre corsa
  const corsa = pick(pool.corsa, rand);
  const corsaTokens = corsa.tokens;

  // Slot 2+3: combinazione che porta il totale a 7
  const splits: [number, number][] = [];
  for (let a = 1; a <= 4; a++) {
    const b = 7 - corsaTokens - a;
    if (b >= 1 && b <= 4) splits.push([a, b]);
  }
  const [t2, t3] = pick(splits, rand);

  const nonCorsa: MissionCategory[] = ['attivita', 'camminata', 'no_drink', 'mentality'];
  const catsFor = (t: number) => nonCorsa.filter(cat => pool[cat].some(m => m.tokens === t));

  const INCOMPATIBLE = new Set(['no_drink', 'mentality']);

  const cats2 = catsFor(t2);
  const cat2 = pick(cats2, rand);
  const cats3 = catsFor(t3).filter(c => {
    if (c === cat2) return false;
    // no_drink e mentality non possono coesistere
    if (INCOMPATIBLE.has(c) && INCOMPATIBLE.has(cat2)) return false;
    return true;
  });
  const cat3 = cats3.length > 0 ? pick(cats3, rand) : pick(catsFor(t3).filter(c => c !== cat2), rand);


  return [
    corsa,
    pool[cat2].find(m => m.tokens === t2)!,
    pool[cat3].find(m => m.tokens === t3)!,
  ];
}

export function getTandemWeekMissions(weekStart: string): MissionDef[] {
  return generateMissions(TANDEM_POOL, 'tandem_' + weekStart);
}

export function getClanMonthMissions(monthStart: string): MissionDef[] {
  return generateMissions(CLAN_POOL, 'clan_' + monthStart);
}

// ─── INJURY HELPERS ──────────────────────────────────────────────────────────

function calcInjuryDays(
  injuryMode: boolean,
  injurySince: string | null,
  periodStart: string,
  totalDays: number,
): number {
  if (!injuryMode || !injurySince) return 0;
  const since = new Date(injurySince);
  const start = new Date(periodStart);
  const effectiveStart = since > start ? since : start;
  const days = Math.floor((Date.now() - effectiveStart.getTime()) / 86400000);
  return Math.max(0, Math.min(days, totalDays));
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function clampEnd(dateStr: string): Date {
  const end = new Date(dateStr);
  const now = new Date();
  return end < now ? end : now;
}

function fmtMins(mins: number, targetH: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m > 0 ? ` ${m}m` : ''} / ${targetH}h`;
}

// ─── TANDEM PROGRESS ─────────────────────────────────────────────────────────

export async function calcTandemProgress(
  mission: MissionDef,
  memberIds: string[],
  weekStart: string,
  weekEnd: string,
): Promise<MissionProgress> {
  if (memberIds.length === 0) return { value: 0, pct: 0, displayValue: `0 / ${mission.target}`, completed: false };

  const from = weekStart;
  const to = weekEnd + 'T23:59:59';
  const N = memberIds.length;

  // Injury: riduci il target proporzionalmente ai giorni di infortunio di ciascun membro
  const { data: injuryData } = await supabase.from('profiles').select('id, injury_mode, injury_since').in('id', memberIds);
  const injuryAdj = (perPersonTarget: number) =>
    (injuryData ?? []).reduce((sum, m) => {
      const days = calcInjuryDays(m.injury_mode, m.injury_since, weekStart, 7);
      return sum + perPersonTarget * (days / 7);
    }, 0);

  switch (mission.category) {
    case 'corsa': {
      const adj = Math.max(0.1, Math.round((mission.target - injuryAdj(mission.target / N)) * 10) / 10);
      const { data } = await supabase.from('logs').select('user_id, km').in('user_id', memberIds).eq('item_id', 'corsa').gte('activity_date', from.slice(0, 10)).lte('activity_date', to.slice(0, 10));
      const perUser: Record<string, number> = {};
      memberIds.forEach(id => { perUser[id] = 0; });
      (data ?? []).forEach((l: any) => { perUser[l.user_id] = (perUser[l.user_id] ?? 0) + (l.km ?? 0); });
      const val = Math.round((Object.values(perUser).reduce((s, v) => s + v, 0)) * 10) / 10;
      const memberValues = memberIds.map(id => ({ id, value: Math.round(perUser[id] * 10) / 10 }));
      return { value: val, pct: Math.min(val / adj, 1), displayValue: `${val} / ${adj} km`, completed: val >= adj, memberValues };
    }
    case 'attivita': {
      const adj = Math.max(1, Math.round(mission.target - injuryAdj(mission.target / N)));
      const { data } = await supabase.from('logs').select('user_id, duration_minutes').in('user_id', memberIds).eq('type', 'workout').neq('item_id', 'corsa').neq('item_id', 'camminata').neq('item_id', 'mentality').gte('activity_date', from.slice(0, 10)).lte('activity_date', to.slice(0, 10));
      const perUser: Record<string, number> = {};
      memberIds.forEach(id => { perUser[id] = 0; });
      (data ?? []).forEach((l: any) => { perUser[l.user_id] = (perUser[l.user_id] ?? 0) + (l.duration_minutes ?? 0); });
      const mins = Object.values(perUser).reduce((s, v) => s + v, 0);
      const memberValues = memberIds.map(id => ({ id, value: perUser[id] }));
      return { value: mins, pct: Math.min(mins / adj, 1), displayValue: fmtMins(mins, adj / 60), completed: mins >= adj, memberValues };
    }
    case 'camminata': {
      const tKm = Math.max(0.1, Math.round((mission.targetKm ?? mission.target - injuryAdj((mission.targetKm ?? mission.target) / N)) * 10) / 10);
      const tElev = Math.max(1, Math.round((mission.targetElevation ?? 9999) - injuryAdj((mission.targetElevation ?? 9999) / N)));
      const { data } = await supabase.from('logs').select('user_id, km, elevation_meters').in('user_id', memberIds).eq('item_id', 'camminata').gte('activity_date', from.slice(0, 10)).lte('activity_date', to.slice(0, 10));
      const perUser: Record<string, number> = {};
      memberIds.forEach(id => { perUser[id] = 0; });
      (data ?? []).forEach((l: any) => { perUser[l.user_id] = (perUser[l.user_id] ?? 0) + (l.km ?? 0); });
      const kmSum = Math.round((Object.values(perUser).reduce((s, v) => s + v, 0)) * 10) / 10;
      const elevSum = Math.round((data ?? []).reduce((s: number, l: any) => s + (l.elevation_meters ?? 0), 0));
      const pct = Math.min(Math.max(kmSum / tKm, elevSum / tElev), 1);
      const memberValues = memberIds.map(id => ({ id, value: Math.round(perUser[id] * 10) / 10 }));
      return { value: kmSum, pct, displayValue: `${kmSum} km  |  ${elevSum} m D+`, completed: kmSum >= tKm || elevSum >= tElev, memberValues };
    }
    case 'no_drink': {
      const end = clampEnd(weekEnd);
      const days = eachDayOfInterval({ start: new Date(weekStart), end });
      const { data } = await supabase.from('logs').select('user_id, activity_date, created_at').in('user_id', memberIds).eq('type', 'drink').gte('activity_date', from.slice(0, 10)).lte('activity_date', to.slice(0, 10));
      const drinkDaysByUser: Record<string, Set<string>> = {};
      memberIds.forEach(id => { drinkDaysByUser[id] = new Set(); });
      (data ?? []).forEach((l: any) => drinkDaysByUser[l.user_id]?.add(l.activity_date ?? l.created_at.slice(0, 10)));
      const perUser: Record<string, number> = {};
      let clean = 0;
      for (const uid of memberIds) {
        const v = days.filter(d => !drinkDaysByUser[uid].has(format(d, 'yyyy-MM-dd'))).length;
        perUser[uid] = v;
        clean += v;
      }
      const total = days.length * memberIds.length;
      const memberValues = memberIds.map(id => ({ id, value: perUser[id] }));
      return { value: clean, pct: Math.min(clean / mission.target, 1), displayValue: `${clean} / ${mission.target} giorni (su ${total} totali)`, completed: clean >= mission.target, memberValues };
    }
    case 'mentality': {
      const end = clampEnd(weekEnd);
      const days = eachDayOfInterval({ start: new Date(weekStart), end });
      const { data } = await supabase.from('logs').select('user_id, activity_date, created_at').in('user_id', memberIds).eq('item_id', 'mentality').gte('activity_date', from.slice(0, 10)).lte('activity_date', to.slice(0, 10));
      const seenKeys = new Set<string>();
      const perUser: Record<string, number> = {};
      memberIds.forEach(id => { perUser[id] = 0; });
      (data ?? []).forEach((l: any) => {
        const key = `${l.user_id}_${l.activity_date ?? l.created_at.slice(0, 10)}`;
        if (!seenKeys.has(key)) { seenKeys.add(key); perUser[l.user_id] = (perUser[l.user_id] ?? 0) + 1; }
      });
      const val = seenKeys.size;
      const total = days.length * memberIds.length;
      const memberValues = memberIds.map(id => ({ id, value: perUser[id] }));
      return { value: val, pct: Math.min(val / mission.target, 1), displayValue: `${val} / ${mission.target} giorni (su ${total} totali)`, completed: val >= mission.target, memberValues };
    }
  }
}

// ─── CLAIM FUNCTIONS ─────────────────────────────────────────────────────────

/** Ritorna il weekStart (lunedì) della settimana PRECEDENTE in formato yyyy-MM-dd */
export function getPrevWeekStart(): string {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=dom, 1=lun, ...
  const daysToLastMonday = dayOfWeek === 0 ? 13 : dayOfWeek + 6;
  const lastMonday = new Date(now.getTime() - daysToLastMonday * 86400000);
  return format(lastMonday, 'yyyy-MM-dd');
}
export function getPrevWeekEnd(): string {
  const prevStart = getPrevWeekStart();
  const prevMonday = new Date(prevStart);
  const sunday = new Date(prevMonday.getTime() + 6 * 86400000);
  return format(sunday, 'yyyy-MM-dd');
}

/** Ritorna il primo giorno del mese PRECEDENTE in formato yyyy-MM-dd */
export function getPrevMonthStart(): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return format(d, 'yyyy-MM-dd');
}
export function getPrevMonthEnd(): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), 0); // ultimo giorno del mese scorso
  return format(d, 'yyyy-MM-dd');
}

/** Può claimare tandem? Solo se prevWeek != tandem_claimed_week */
export async function getTandemClaimState(userId: string): Promise<{ claimedWeek: string | null }> {
  const { data } = await supabase.from('profiles').select('tandem_claimed_week').eq('id', userId).single();
  return { claimedWeek: data?.tandem_claimed_week ?? null };
}

export async function getClanClaimState(userId: string): Promise<{ claimedMonth: string | null }> {
  const { data } = await supabase.from('profiles').select('clan_claimed_month').eq('id', userId).single();
  return { claimedMonth: data?.clan_claimed_month ?? null };
}

/** Claim tandem: aggiorna tandem_claimed_week e aggiunge tokens */
export async function claimTandemMissions(userId: string, weekStart: string, tokens: number, missionCount: number = 1): Promise<boolean> {
  const { data } = await supabase.from('profiles').select('tokens, tandem_claimed_week, tandem_missions_done').eq('id', userId).single();
  if (!data) return false;
  if (data.tandem_claimed_week === weekStart) return false; // già riscosso
  await supabase.from('profiles').update({
    tandem_claimed_week: weekStart,
    tokens: (data.tokens ?? 0) + tokens,
    tandem_missions_done: (data.tandem_missions_done ?? 0) + missionCount,
  }).eq('id', userId);
  return true;
}

/** Claim clan: aggiorna clan_claimed_month e aggiunge tokens */
export async function claimClanMissions(userId: string, monthStart: string, tokens: number): Promise<boolean> {
  const { data } = await supabase.from('profiles').select('tokens, clan_claimed_month').eq('id', userId).single();
  if (!data) return false;
  if (data.clan_claimed_month === monthStart) return false; // già riscosso
  const { data: cur2 } = await supabase.from('profiles').select('clan_missions_done').eq('id', userId).single().then(r => r, () => ({ data: null }));
  await supabase.from('profiles').update({
    clan_claimed_month: monthStart,
    tokens: (data.tokens ?? 0) + tokens,
    clan_missions_done: ((cur2 as any)?.clan_missions_done ?? 0) + 1,
  }).eq('id', userId);
  return true;
}

// ─── CLAN PROGRESS ───────────────────────────────────────────────────────────

export async function calcClanProgress(
  mission: MissionDef,
  memberIds: string[],
  monthStart: string,
  monthEnd: string,
): Promise<MissionProgress> {
  if (memberIds.length === 0) return { value: 0, pct: 0, displayValue: '0 / -', completed: false };

  const n = memberIds.length;
  const from = monthStart;
  const to = monthEnd + 'T23:59:59';

  const daysInMonth = eachDayOfInterval({ start: new Date(monthStart), end: new Date(monthEnd) }).length;
  const { data: injuryData } = await supabase.from('profiles').select('id, injury_mode, injury_since').in('id', memberIds);
  const injuryAdj = (perPersonTarget: number) =>
    (injuryData ?? []).reduce((sum, m) => {
      const days = calcInjuryDays(m.injury_mode, m.injury_since, monthStart, daysInMonth);
      return sum + perPersonTarget * (days / daysInMonth);
    }, 0);

  switch (mission.category) {
    case 'corsa': {
      const total = Math.max(n * 0.1, Math.round((mission.target * n - injuryAdj(mission.target)) * 10) / 10);
      const { data } = await supabase.from('logs').select('user_id, km').in('user_id', memberIds).eq('item_id', 'corsa').gte('activity_date', from.slice(0, 10)).lte('activity_date', to.slice(0, 10));
      const perUser: Record<string, number> = {};
      memberIds.forEach(id => { perUser[id] = 0; });
      (data ?? []).forEach((l: any) => { perUser[l.user_id] = (perUser[l.user_id] ?? 0) + (l.km ?? 0); });
      const val = Math.round((Object.values(perUser).reduce((s, v) => s + v, 0)) * 10) / 10;
      const memberValues = memberIds.map(id => ({ id, value: Math.round(perUser[id] * 10) / 10 }));
      return { value: val, pct: Math.min(val / total, 1), displayValue: `${val} / ${total} km`, completed: val >= total, memberValues };
    }
    case 'attivita': {
      const total = Math.max(n, Math.round(mission.target * n - injuryAdj(mission.target)));
      const { data } = await supabase.from('logs').select('user_id, duration_minutes').in('user_id', memberIds).eq('type', 'workout').neq('item_id', 'corsa').neq('item_id', 'camminata').neq('item_id', 'mentality').gte('activity_date', from.slice(0, 10)).lte('activity_date', to.slice(0, 10));
      const perUser: Record<string, number> = {};
      memberIds.forEach(id => { perUser[id] = 0; });
      (data ?? []).forEach((l: any) => { perUser[l.user_id] = (perUser[l.user_id] ?? 0) + (l.duration_minutes ?? 0); });
      const mins = Object.values(perUser).reduce((s, v) => s + v, 0);
      const memberValues = memberIds.map(id => ({ id, value: perUser[id] }));
      return { value: mins, pct: Math.min(mins / total, 1), displayValue: fmtMins(mins, total / 60), completed: mins >= total, memberValues };
    }
    case 'camminata': {
      const tKm = Math.max(n * 0.1, Math.round(((mission.targetKm ?? mission.target) * n - injuryAdj(mission.targetKm ?? mission.target)) * 10) / 10);
      const tElev = Math.max(n, Math.round((mission.targetElevation ?? 9999) * n - injuryAdj(mission.targetElevation ?? 9999)));
      const { data } = await supabase.from('logs').select('user_id, km, elevation_meters').in('user_id', memberIds).eq('item_id', 'camminata').gte('activity_date', from.slice(0, 10)).lte('activity_date', to.slice(0, 10));
      const perUser: Record<string, number> = {};
      memberIds.forEach(id => { perUser[id] = 0; });
      (data ?? []).forEach((l: any) => { perUser[l.user_id] = (perUser[l.user_id] ?? 0) + (l.km ?? 0); });
      const kmSum = Math.round((Object.values(perUser).reduce((s, v) => s + v, 0)) * 10) / 10;
      const elevSum = Math.round((data ?? []).reduce((s: number, l: any) => s + (l.elevation_meters ?? 0), 0));
      const pct = Math.min(Math.max(kmSum / tKm, elevSum / tElev), 1);
      const memberValues = memberIds.map(id => ({ id, value: Math.round(perUser[id] * 10) / 10 }));
      return { value: kmSum, pct, displayValue: `${kmSum} km  |  ${elevSum} m D+`, completed: kmSum >= tKm || elevSum >= tElev, memberValues };
    }
    case 'no_drink': {
      const end = clampEnd(monthEnd);
      const days = eachDayOfInterval({ start: new Date(monthStart), end });
      const total = mission.target * n;
      const { data } = await supabase.from('logs').select('user_id, activity_date, created_at').in('user_id', memberIds).eq('type', 'drink').gte('activity_date', from.slice(0, 10)).lte('activity_date', to.slice(0, 10));
      const drinkDaysByUser: Record<string, Set<string>> = {};
      memberIds.forEach(id => { drinkDaysByUser[id] = new Set(); });
      (data ?? []).forEach((l: any) => drinkDaysByUser[l.user_id]?.add(l.activity_date ?? l.created_at.slice(0, 10)));
      const perUser: Record<string, number> = {};
      let clean = 0;
      for (const uid of memberIds) {
        const v = days.filter(d => !drinkDaysByUser[uid].has(format(d, 'yyyy-MM-dd'))).length;
        perUser[uid] = v;
        clean += v;
      }
      const memberValues = memberIds.map(id => ({ id, value: perUser[id] }));
      return { value: clean, pct: Math.min(clean / total, 1), displayValue: `${clean} / ${total} giorni`, completed: clean >= total, memberValues };
    }
    case 'mentality': {
      const end = clampEnd(monthEnd);
      const daysInMonth = eachDayOfInterval({ start: new Date(monthStart), end }).length;
      const fullMonth = eachDayOfInterval({ start: new Date(monthStart), end: new Date(monthEnd) }).length;
      const targetCount = Math.round((mission.target / 100) * n * fullMonth);
      const { data } = await supabase.from('logs').select('user_id, activity_date, created_at').in('user_id', memberIds).eq('item_id', 'mentality').gte('activity_date', from.slice(0, 10)).lte('activity_date', to.slice(0, 10));
      const seenKeys = new Set<string>();
      const perUser: Record<string, number> = {};
      memberIds.forEach(id => { perUser[id] = 0; });
      (data ?? []).forEach((l: any) => {
        const key = `${l.user_id}_${l.activity_date ?? l.created_at.slice(0, 10)}`;
        if (!seenKeys.has(key)) { seenKeys.add(key); perUser[l.user_id] = (perUser[l.user_id] ?? 0) + 1; }
      });
      const val = seenKeys.size;
      const memberValues = memberIds.map(id => ({ id, value: perUser[id] }));
      return { value: val, pct: Math.min(val / targetCount, 1), displayValue: `${val} / ${targetCount} (${mission.target}% di ${n}×${daysInMonth}gg)`, completed: val >= targetCount, memberValues };
    }
  }
}
