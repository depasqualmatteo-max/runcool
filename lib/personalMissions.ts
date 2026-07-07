import { supabase } from './supabase';
import { format, startOfWeek, eachDayOfInterval, parseISO, subDays } from 'date-fns';

// ─── MISSIONI SEQUENZIALI (100) ───────────────────────────────────────────────

export type MissionType =
  | 'corsa_singola' | 'camminata' | 'tempo_attivita' | 'mentality'
  | 'km_settimanali' | 'no_drink' | 'camminata_dislivello'
  | 'missioni_giornaliere' | 'missioni_tandem' | 'missioni_clan' | 'classifica_mensile';

export interface SeqMission {
  id: number;
  type: MissionType;
  label: string;
  target: number; // in base unit (km, min, giorni, n)
  targetLabel: string;
}

export const SEQ_MISSIONS: SeqMission[] = [
  { id: 1,   type: 'corsa_singola',       label: 'Percorri 1 km in una corsa',                    target: 1,    targetLabel: '1 km' },
  { id: 2,   type: 'camminata',           label: 'Fai una camminata di 2 km',                     target: 2,    targetLabel: '2 km' },
  { id: 3,   type: 'tempo_attivita',      label: 'Fai 15 minuti di attività',                     target: 15,   targetLabel: '15 min' },
  { id: 4,   type: 'mentality',           label: 'Prendi 1 Mentality',                            target: 1,    targetLabel: '1 consecutivo' },
  { id: 5,   type: 'missioni_giornaliere',label: 'Completa 1 missione giornaliera',               target: 1,    targetLabel: '1 missione' },
  { id: 6,   type: 'corsa_singola',       label: 'Percorri 2 km in una corsa',                    target: 2,    targetLabel: '2 km' },
  { id: 7,   type: 'no_drink',            label: 'Non bere per 1 giorno',                         target: 1,    targetLabel: '1 giorno' },
  { id: 8,   type: 'camminata_dislivello',label: 'Fai una camminata con 50 m D+',                 target: 50,   targetLabel: '50 m D+' },
  { id: 9,   type: 'km_settimanali',      label: 'Percorri 3 km in una settimana',                target: 3,    targetLabel: '3 km' },
  { id: 10,  type: 'tempo_attivita',      label: 'Fai 30 minuti di attività',                     target: 30,   targetLabel: '30 min' },
  { id: 11,  type: 'mentality',           label: 'Prendi 2 Mentality consecutivi',                target: 2,    targetLabel: '2 consecutivi' },
  { id: 12,  type: 'missioni_giornaliere',label: 'Completa 3 missioni giornaliere',               target: 3,    targetLabel: '3 missioni' },
  { id: 13,  type: 'camminata',           label: 'Fai una camminata di 3 km',                     target: 3,    targetLabel: '3 km' },
  { id: 14,  type: 'corsa_singola',       label: 'Percorri 3 km in una corsa',                    target: 3,    targetLabel: '3 km' },
  { id: 15,  type: 'missioni_tandem',     label: 'Completa 1 missione tandem',                    target: 1,    targetLabel: '1 tandem' },
  { id: 16,  type: 'km_settimanali',      label: 'Percorri 5 km in una settimana',                target: 5,    targetLabel: '5 km' },
  { id: 17,  type: 'no_drink',            label: 'Non bere per 2 giorni',                         target: 2,    targetLabel: '2 giorni' },
  { id: 18,  type: 'camminata',           label: 'Fai una camminata di 5 km',                     target: 5,    targetLabel: '5 km' },
  { id: 19,  type: 'tempo_attivita',      label: 'Fai 45 minuti di attività',                     target: 45,   targetLabel: '45 min' },
  { id: 20,  type: 'mentality',           label: 'Prendi 3 Mentality consecutivi',                target: 3,    targetLabel: '3 consecutivi' },
  { id: 21,  type: 'corsa_singola',       label: 'Percorri 5 km in una corsa',                    target: 5,    targetLabel: '5 km' },
  { id: 22,  type: 'camminata_dislivello',label: 'Fai una camminata con 150 m D+',                target: 150,  targetLabel: '150 m D+' },
  { id: 23,  type: 'missioni_giornaliere',label: 'Completa 5 missioni giornaliere',               target: 5,    targetLabel: '5 missioni' },
  { id: 24,  type: 'classifica_mensile',  label: 'Arriva nella Top 99% della classifica mensile', target: 99,   targetLabel: 'Top 99%' },
  { id: 25,  type: 'km_settimanali',      label: 'Percorri 8 km in una settimana',                target: 8,    targetLabel: '8 km' },
  { id: 26,  type: 'tempo_attivita',      label: 'Fai 1 ora di attività',                         target: 60,   targetLabel: '60 min' },
  { id: 27,  type: 'missioni_tandem',     label: 'Completa 2 missioni tandem',                    target: 2,    targetLabel: '2 tandem' },
  { id: 28,  type: 'camminata',           label: 'Fai una camminata di 7 km',                     target: 7,    targetLabel: '7 km' },
  { id: 29,  type: 'mentality',           label: 'Prendi 5 Mentality consecutivi',                target: 5,    targetLabel: '5 consecutivi' },
  { id: 30,  type: 'missioni_clan',       label: 'Completa 1 missione clan',                      target: 1,    targetLabel: '1 clan' },
  { id: 31,  type: 'corsa_singola',       label: 'Percorri 7 km in una corsa',                    target: 7,    targetLabel: '7 km' },
  { id: 32,  type: 'no_drink',            label: 'Non bere per 3 giorni',                         target: 3,    targetLabel: '3 giorni' },
  { id: 33,  type: 'km_settimanali',      label: 'Percorri 12 km in una settimana',               target: 12,   targetLabel: '12 km' },
  { id: 34,  type: 'camminata_dislivello',label: 'Fai una camminata con 300 m D+',                target: 300,  targetLabel: '300 m D+' },
  { id: 35,  type: 'tempo_attivita',      label: 'Fai 1h30 di attività',                          target: 90,   targetLabel: '90 min' },
  { id: 36,  type: 'camminata',           label: 'Fai una camminata di 10 km',                    target: 10,   targetLabel: '10 km' },
  { id: 37,  type: 'missioni_giornaliere',label: 'Completa 7 missioni giornaliere',               target: 7,    targetLabel: '7 missioni' },
  { id: 38,  type: 'mentality',           label: 'Prendi 7 Mentality consecutivi',                target: 7,    targetLabel: '7 consecutivi' },
  { id: 39,  type: 'classifica_mensile',  label: 'Arriva nella Top 50% della classifica mensile', target: 50,   targetLabel: 'Top 50%' },
  { id: 40,  type: 'corsa_singola',       label: 'Percorri 10 km in una corsa',                   target: 10,   targetLabel: '10 km' },
  { id: 41,  type: 'km_settimanali',      label: 'Percorri 15 km in una settimana',               target: 15,   targetLabel: '15 km' },
  { id: 42,  type: 'missioni_tandem',     label: 'Completa 3 missioni tandem',                    target: 3,    targetLabel: '3 tandem' },
  { id: 43,  type: 'camminata_dislivello',label: 'Fai una camminata con 500 m D+',                target: 500,  targetLabel: '500 m D+' },
  { id: 44,  type: 'tempo_attivita',      label: 'Fai 2 ore di attività',                         target: 120,  targetLabel: '120 min' },
  { id: 45,  type: 'no_drink',            label: 'Non bere per 5 giorni',                         target: 5,    targetLabel: '5 giorni' },
  { id: 46,  type: 'missioni_clan',       label: 'Completa 2 missioni clan',                      target: 2,    targetLabel: '2 clan' },
  { id: 47,  type: 'camminata',           label: 'Fai una camminata di 13 km',                    target: 13,   targetLabel: '13 km' },
  { id: 48,  type: 'mentality',           label: 'Prendi 10 Mentality consecutivi',               target: 10,   targetLabel: '10 consecutivi' },
  { id: 49,  type: 'missioni_giornaliere',label: 'Completa 10 missioni giornaliere',              target: 10,   targetLabel: '10 missioni' },
  { id: 50,  type: 'km_settimanali',      label: 'Percorri 20 km in una settimana',               target: 20,   targetLabel: '20 km' },
  { id: 51,  type: 'corsa_singola',       label: 'Percorri 12 km in una corsa',                   target: 12,   targetLabel: '12 km' },
  { id: 52,  type: 'classifica_mensile',  label: 'Arriva nella Top 25% della classifica mensile', target: 25,   targetLabel: 'Top 25%' },
  { id: 53,  type: 'camminata_dislivello',label: 'Fai una camminata con 700 m D+',                target: 700,  targetLabel: '700 m D+' },
  { id: 54,  type: 'no_drink',            label: 'Non bere per 7 giorni',                         target: 7,    targetLabel: '7 giorni' },
  { id: 55,  type: 'km_settimanali',      label: 'Percorri 25 km in una settimana',               target: 25,   targetLabel: '25 km' },
  { id: 56,  type: 'tempo_attivita',      label: 'Fai 3 ore di attività',                         target: 180,  targetLabel: '180 min' },
  { id: 57,  type: 'camminata',           label: 'Fai una camminata di 16 km',                    target: 16,   targetLabel: '16 km' },
  { id: 58,  type: 'mentality',           label: 'Prendi 14 Mentality consecutivi',               target: 14,   targetLabel: '14 consecutivi' },
  { id: 59,  type: 'missioni_tandem',     label: 'Completa 5 missioni tandem',                    target: 5,    targetLabel: '5 tandem' },
  { id: 60,  type: 'corsa_singola',       label: 'Percorri 15 km in una corsa',                   target: 15,   targetLabel: '15 km' },
  { id: 61,  type: 'missioni_giornaliere',label: 'Completa 15 missioni giornaliere',              target: 15,   targetLabel: '15 missioni' },
  { id: 62,  type: 'camminata_dislivello',label: 'Fai una camminata con 850 m D+',                target: 850,  targetLabel: '850 m D+' },
  { id: 63,  type: 'km_settimanali',      label: 'Percorri 30 km in una settimana',               target: 30,   targetLabel: '30 km' },
  { id: 64,  type: 'missioni_clan',       label: 'Completa 3 missioni clan',                      target: 3,    targetLabel: '3 clan' },
  { id: 65,  type: 'classifica_mensile',  label: 'Arriva nella Top 10% della classifica mensile', target: 10,   targetLabel: 'Top 10%' },
  { id: 66,  type: 'camminata',           label: 'Fai una camminata di 20 km',                    target: 20,   targetLabel: '20 km' },
  { id: 67,  type: 'tempo_attivita',      label: 'Fai 4 ore di attività',                         target: 240,  targetLabel: '240 min' },
  { id: 68,  type: 'mentality',           label: 'Prendi 20 Mentality consecutivi',               target: 20,   targetLabel: '20 consecutivi' },
  { id: 69,  type: 'no_drink',            label: 'Non bere per 10 giorni',                        target: 10,   targetLabel: '10 giorni' },
  { id: 70,  type: 'corsa_singola',       label: 'Percorri 18 km in una corsa',                   target: 18,   targetLabel: '18 km' },
  { id: 71,  type: 'km_settimanali',      label: 'Percorri 40 km in una settimana',               target: 40,   targetLabel: '40 km' },
  { id: 72,  type: 'camminata_dislivello',label: 'Fai una camminata con 1000 m D+',               target: 1000, targetLabel: '1000 m D+' },
  { id: 73,  type: 'classifica_mensile',  label: 'Arriva nella Top 5% della classifica mensile',  target: 5,    targetLabel: 'Top 5%' },
  { id: 74,  type: 'corsa_singola',       label: 'Percorri 21 km (mezza maratona)',                target: 21,   targetLabel: '21 km' },
  { id: 75,  type: 'mentality',           label: 'Prendi 30 Mentality consecutivi',               target: 30,   targetLabel: '30 consecutivi' },
  { id: 76,  type: 'camminata',           label: 'Fai una camminata di 25 km',                    target: 25,   targetLabel: '25 km' },
  { id: 77,  type: 'no_drink',            label: 'Non bere per 14 giorni',                        target: 14,   targetLabel: '14 giorni' },
  { id: 78,  type: 'missioni_giornaliere',label: 'Completa 25 missioni giornaliere',              target: 25,   targetLabel: '25 missioni' },
  { id: 79,  type: 'missioni_tandem',     label: 'Completa 8 missioni tandem',                    target: 8,    targetLabel: '8 tandem' },
  { id: 80,  type: 'tempo_attivita',      label: 'Fai 6 ore di attività',                         target: 360,  targetLabel: '360 min' },
  { id: 81,  type: 'km_settimanali',      label: 'Percorri 50 km in una settimana',               target: 50,   targetLabel: '50 km' },
  { id: 82,  type: 'camminata_dislivello',label: 'Fai una camminata con 1300 m D+',               target: 1300, targetLabel: '1300 m D+' },
  { id: 83,  type: 'missioni_clan',       label: 'Completa 5 missioni clan',                      target: 5,    targetLabel: '5 clan' },
  { id: 84,  type: 'classifica_mensile',  label: 'Arriva nella Top 3% della classifica mensile',  target: 3,    targetLabel: 'Top 3%' },
  { id: 85,  type: 'corsa_singola',       label: 'Percorri 25 km in una corsa',                   target: 25,   targetLabel: '25 km' },
  { id: 86,  type: 'mentality',           label: 'Prendi 50 Mentality consecutivi',               target: 50,   targetLabel: '50 consecutivi' },
  { id: 87,  type: 'camminata_dislivello',label: 'Fai una camminata con 1500 m D+',               target: 1500, targetLabel: '1500 m D+' },
  { id: 88,  type: 'km_settimanali',      label: 'Percorri 70 km in una settimana',               target: 70,   targetLabel: '70 km' },
  { id: 89,  type: 'no_drink',            label: 'Non bere per 21 giorni',                        target: 21,   targetLabel: '21 giorni' },
  { id: 90,  type: 'camminata',           label: 'Fai una camminata di 30 km',                    target: 30,   targetLabel: '30 km' },
  { id: 91,  type: 'tempo_attivita',      label: 'Fai 10 ore di attività',                        target: 600,  targetLabel: '600 min' },
  { id: 92,  type: 'missioni_giornaliere',label: 'Completa 50 missioni giornaliere',              target: 50,   targetLabel: '50 missioni' },
  { id: 93,  type: 'corsa_singola',       label: 'Percorri 30 km in una corsa',                   target: 30,   targetLabel: '30 km' },
  { id: 94,  type: 'classifica_mensile',  label: 'Arriva nella Top 2% della classifica mensile',  target: 2,    targetLabel: 'Top 2%' },
  { id: 95,  type: 'missioni_tandem',     label: 'Completa 12 missioni tandem',                   target: 12,   targetLabel: '12 tandem' },
  { id: 96,  type: 'km_settimanali',      label: 'Corri 100 km in una settimana',                 target: 100,  targetLabel: '100 km' },
  { id: 97,  type: 'camminata_dislivello',label: 'Fai una camminata con 2000 m D+',               target: 2000, targetLabel: '2000 m D+' },
  { id: 98,  type: 'no_drink',            label: 'Non bere per 30 giorni',                        target: 30,   targetLabel: '30 giorni' },
  { id: 99,  type: 'mentality',           label: 'Prendi 100 Mentality consecutivi',              target: 100,  targetLabel: '100 consecutivi' },
  { id: 100, type: 'classifica_mensile',  label: 'Arriva nella Top 1% della classifica mensile',  target: 1,    targetLabel: 'Top 1%' },
];

// ─── MISSIONI GIORNALIERE ──────────────────────────────────────────────────────

function hashInt(n: number): number {
  n = (Math.imul(n ^ (n >>> 16), 0x45d9f3b)) | 0;
  n = (Math.imul(n ^ (n >>> 16), 0x45d9f3b)) | 0;
  return (n ^ (n >>> 16)) >>> 0;
}

function seededRand(seed: number) {
  let s = hashInt(seed);
  return () => { s = (Math.imul(s, 1664525) + 1013904223) | 0; return (s >>> 0) / 0x100000000; };
}

export interface DailyMissions {
  runKm: number;       // 5-15
  activityMin: number; // 30, 45, 60, 75, 90
}

export function getTodayDailyMissions(): DailyMissions {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const rand = seededRand(seed);
  const runOptions = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  const actOptions = [30, 45, 60, 75, 90];
  return {
    runKm: runOptions[Math.floor(rand() * runOptions.length)],
    activityMin: actOptions[Math.floor(rand() * actOptions.length)],
  };
}

export interface DailyProgress {
  runKm: number;
  activityMin: number;
  noDrink: boolean;
  drankYesterday: boolean;
  injuryMode: boolean;
  injurySince: string | null;
}

export async function getDailyProgress(userId: string): Promise<DailyProgress> {
  // Calcola inizio/fine giornata locale in UTC (Italia = UTC+2 estate, UTC+1 inverno)
  const nowLocal = new Date();
  const todayStart = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate(), 0, 0, 0);
  const todayEnd   = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate(), 23, 59, 59);
  const yesterStart = new Date(todayStart.getTime() - 86400000);
  const yesterEnd   = new Date(todayEnd.getTime()   - 86400000);

  const todayIso = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth()+1).padStart(2,'0')}-${String(nowLocal.getDate()).padStart(2,'0')}`;
  const yesterIso = format(new Date(todayStart.getTime() - 86400000), 'yyyy-MM-dd');

  // Log di oggi per corsa e attività (usa activity_date per rispettare date retroattive)
  const { data: todayLogs } = await supabase
    .from('logs')
    .select('type, km, duration_minutes, item_id')
    .eq('user_id', userId)
    .eq('activity_date', todayIso);

  // Drink di ieri
  const { data: yesterdayDrinks } = await supabase
    .from('logs')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'drink')
    .eq('activity_date', yesterIso);

  const logs = todayLogs ?? [];
  const workouts = logs.filter(l => l.type === 'workout');

  // km corsi oggi: solo item_id = 'corsa', somma colonna km
  const runKm = workouts
    .filter(l => l.item_id === 'corsa')
    .reduce((s, l) => s + (l.km ?? 0), 0);

  // minuti attività oggi (escludi corsa e mentality che hanno le proprie missioni)
  const activityMin = workouts
    .filter(l => l.item_id !== 'corsa' && l.item_id !== 'camminata' && l.item_id !== 'mentality')
    .reduce((s, l) => s + (l.duration_minutes ?? 0), 0);

  const drankYesterday = (yesterdayDrinks ?? []).length > 0;

  const { data: profile } = await supabase
    .from('profiles')
    .select('injury_mode, injury_since')
    .eq('id', userId)
    .single();

  return {
    runKm,
    activityMin,
    noDrink: !drankYesterday,
    drankYesterday,
    injuryMode: profile?.injury_mode ?? false,
    injurySince: profile?.injury_since ?? null,
  };
}

// ─── MISSIONI SEQUENZIALI: calcolo progresso ──────────────────────────────────

export interface SeqProgress {
  value: number;
  pct: number;
  displayValue: string;
  completed: boolean;
}

export async function calcSeqProgress(mission: SeqMission, userId: string, missionStartedAt: string): Promise<SeqProgress> {
  const none = (v: number) => {
    const pct = Math.min(v / mission.target, 1);
    return { value: v, pct, displayValue: `${v} / ${mission.target}`, completed: pct >= 1 };
  };

  const since = missionStartedAt; // filtra da quando la missione è stata assegnata

  try {
    switch (mission.type) {
      case 'corsa_singola': {
        const { data } = await supabase.from('logs').select('km')
          .eq('user_id', userId).eq('type', 'workout').eq('item_id', 'corsa')
          .gte('activity_date', since.slice(0, 10))
          .order('km', { ascending: false }).limit(1);
        const best = data?.[0]?.km ?? 0;
        return { value: best, pct: Math.min(best / mission.target, 1), displayValue: `${Number(best).toFixed(1)} / ${mission.target} km`, completed: best >= mission.target };
      }
      case 'camminata': {
        const { data } = await supabase.from('logs').select('km')
          .eq('user_id', userId).eq('type', 'workout').eq('item_id', 'camminata')
          .gte('activity_date', since.slice(0, 10))
          .order('km', { ascending: false }).limit(1);
        const best = data?.[0]?.km ?? 0;
        return { value: best, pct: Math.min(best / mission.target, 1), displayValue: `${Number(best).toFixed(1)} / ${mission.target} km`, completed: best >= mission.target };
      }
      case 'tempo_attivita': {
        // Migliore sessione singola con durata >= target (escludi corsa che conta sui km)
        const { data } = await supabase.from('logs').select('duration_minutes')
          .eq('user_id', userId).eq('type', 'workout')
          .neq('item_id', 'corsa').neq('item_id', 'camminata').neq('item_id', 'mentality')
          .gte('activity_date', since.slice(0, 10))
          .not('duration_minutes', 'is', null)
          .order('duration_minutes', { ascending: false }).limit(1);
        const best = data?.[0]?.duration_minutes ?? 0;
        return { value: best, pct: Math.min(best / mission.target, 1), displayValue: `${best} / ${mission.target} min`, completed: best >= mission.target };
      }
      case 'km_settimanali': {
        const { data } = await supabase.from('logs').select('km, activity_date, created_at')
          .eq('user_id', userId).eq('type', 'workout').eq('item_id', 'corsa')
          .gte('activity_date', since.slice(0, 10));
        if (!data || data.length === 0) return none(0);
        const weeks: Record<string, number> = {};
        for (const l of data) {
          const dateStr = l.activity_date ?? l.created_at.split('T')[0];
          const w = format(startOfWeek(parseISO(dateStr), { weekStartsOn: 1 }), 'yyyy-ww');
          weeks[w] = (weeks[w] ?? 0) + (l.km ?? 0);
        }
        const best = Math.max(...Object.values(weeks));
        return { value: best, pct: Math.min(best / mission.target, 1), displayValue: `${best.toFixed(1)} / ${mission.target} km`, completed: best >= mission.target };
      }
      case 'no_drink': {
        const { data: drinkLogs } = await supabase.from('logs').select('activity_date, created_at')
          .eq('user_id', userId).eq('type', 'drink')
          .gte('activity_date', since.slice(0, 10)).order('activity_date');
        const drinkDays = new Set((drinkLogs ?? []).map(l => l.activity_date ?? l.created_at.split('T')[0]));
        const start = parseISO(since);
        const end = subDays(new Date(), 1); // escludi oggi: il giorno non è finito
        const days = eachDayOfInterval({ start, end });
        let maxStreak = 0, cur = 0;
        for (const d of days) {
          if (!drinkDays.has(format(d, 'yyyy-MM-dd'))) { cur++; maxStreak = Math.max(maxStreak, cur); }
          else cur = 0;
        }
        return { value: maxStreak, pct: Math.min(maxStreak / mission.target, 1), displayValue: `${maxStreak} / ${mission.target} giorni`, completed: maxStreak >= mission.target };
      }
      case 'mentality': {
        const { data } = await supabase.from('logs').select('activity_date, created_at')
          .eq('user_id', userId).eq('item_id', 'mentality')
          .gte('activity_date', since.slice(0, 10)).order('activity_date');
        if (!data || data.length === 0) return none(0);
        const days = [...new Set(data.map(l => l.activity_date ?? l.created_at.split('T')[0]))].sort();
        let maxStreak = 1, cur = 1;
        for (let i = 1; i < days.length; i++) {
          const diff = (new Date(days[i]).getTime() - new Date(days[i-1]).getTime()) / 86400000;
          if (diff === 1) { cur++; maxStreak = Math.max(maxStreak, cur); }
          else cur = 1;
        }
        return { value: maxStreak, pct: Math.min(maxStreak / mission.target, 1), displayValue: `${maxStreak} / ${mission.target} consecutivi`, completed: maxStreak >= mission.target };
      }
      case 'camminata_dislivello': {
        const { data } = await supabase.from('logs').select('elevation_meters')
          .eq('user_id', userId).eq('type', 'workout').eq('item_id', 'camminata')
          .gte('activity_date', since.slice(0, 10))
          .order('elevation_meters', { ascending: false }).limit(1);
        const best = data?.[0]?.elevation_meters ?? 0;
        return { value: best, pct: Math.min(best / mission.target, 1), displayValue: `${best} / ${mission.target} m D+`, completed: best >= mission.target };
      }
      case 'missioni_giornaliere': {
        const { data: profile } = await supabase.from('profiles').select('daily_missions_done').eq('id', userId).single();
        const v = profile?.daily_missions_done ?? 0;
        return { value: v, pct: Math.min(v / mission.target, 1), displayValue: `${v} / ${mission.target}`, completed: v >= mission.target };
      }
      case 'missioni_tandem':
      case 'missioni_clan':
      case 'classifica_mensile':
      default:
        return { value: 0, pct: 0, displayValue: `— / ${mission.targetLabel}`, completed: false };
    }
  } catch {
    return { value: 0, pct: 0, displayValue: '...', completed: false };
  }
}

// Incrementa missione sequenziale completata
export async function advanceSeqMission(userId: string, currentId: number) {
  if (currentId >= 100) return;
  await supabase.from('profiles').update({
    current_mission: currentId + 1,
    mission_started_at: new Date().toISOString(),
  }).eq('id', userId);
}

// Incrementa contatore missioni giornaliere completate
export async function incrementDailyMissionsDone(userId: string) {
  const { data } = await supabase.from('profiles').select('daily_missions_done').eq('id', userId).single();
  const n = (data?.daily_missions_done ?? 0) + 1;
  await supabase.from('profiles').update({ daily_missions_done: n }).eq('id', userId);
}

// Claim gettone missione giornaliera (bit: 1=run, 2=activity, 4=nodrink)
// Ritorna true se il claim è andato a buon fine, false se già riscosso
export async function claimDailyMission(userId: string, bit: 1 | 2 | 4): Promise<boolean> {
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data, error } = await supabase.rpc('claim_daily_mission_atomic', {
    p_user_id: userId,
    p_bit: bit,
    p_date: today,
  });
  if (error) return false;
  return data === true;
}

// Carica la mask dei claim giornalieri (resettata se data diversa da oggi)
export async function getDailyClaimedMask(userId: string): Promise<number> {
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data } = await supabase
    .from('profiles')
    .select('daily_claimed_date, daily_claimed_mask')
    .eq('id', userId)
    .single();
  if (!data) return 0;
  if (data.daily_claimed_date !== today) return 0;
  return data.daily_claimed_mask ?? 0;
}
