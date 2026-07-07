import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AppState, DrinkLog, LogEntry, WorkoutLog } from '@/types';
import { DRINK_MAP } from '@/constants/drinks';
import { WORKOUT_MAP, calcWalkingCalories, calcHeartsFromDuration } from '@/constants/workouts';
import { calcHeartsLost, calcHeartsGained } from '@/constants/hearts';
import { useAuth } from '@/context/AuthContext';
import { sendPushNotification } from '@/lib/notifications';
import { getCountryCode } from '@/lib/geo';
import { VARIANT_SKIN_IDS } from '@/constants/shop';
import type { DrinkId, WorkoutId } from '@/types';

export interface LogWorkoutParams {
  workoutId: WorkoutId;
  durationMinutes?: number;
  km?: number;
  elevationMeters?: number;
  /** Se passato, usa queste calorie direttamente senza ricalcolare (usato da health import) */
  overrideCalories?: number;
  activityDate?: string;
}

interface AppContextValue {
  state: AppState;
  isLoading: boolean;
  logDrink: (drinkId: DrinkId, quantity: number, activityDate?: string) => Promise<string | null>;
  logWorkout: (params: LogWorkoutParams) => Promise<string | null>;
  deleteLog: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

// Gerarchia notifiche:
// every_activity → riceve sport + recap + importanti
// evening_recap  → riceve recap + importanti
// important      → riceve solo importanti
// none           → niente

const SPORT_MESSAGES = [
  (u: string) => `Oink oink! ${u} sta grufolando più di te`,
  (u: string) => `${u} ha smesso di rotolarsi nel fango e si è messo a correre`,
  (u: string) => `Questo maialino di ${u} si sta allenando… e tu?`,
  (u: string) => `${u} sta sudando come un maialino in sauna`,
  (u: string) => `Attenzione! Il maiale ${u} ti sta tallonando in classifica`,
  (u: string) => `${u} ha appena guadagnato cuori. Stai diventando il maiale più pigro del clan?`,
];

async function notifyWorkout(actorId: string, actorUsername: string, workoutLabel: string) {
  try {
    const { data: subs } = await supabase
      .from('profiles')
      .select('id, push_token')
      .in('notif_pref', ['every_activity'])
      .not('push_token', 'is', null)
      .neq('id', actorId);

    if (!subs || subs.length === 0) return;
    const msg = SPORT_MESSAGES[Math.floor(Math.random() * SPORT_MESSAGES.length)];
    for (const s of subs) {
      if (!s.push_token) continue;
      await sendPushNotification(s.push_token, `RunCool 💪`, msg(actorUsername));
    }
  } catch {}
}

function rowToLogEntry(row: any): LogEntry {
  if (row.type === 'drink') {
    return {
      id: row.id,
      type: 'drink',
      drinkId: row.item_id as DrinkId,
      drinkName: row.item_name,
      quantity: row.quantity,
      calories: row.calories,
      heartsLost: Math.abs(row.hearts_delta),
      timestamp: row.created_at,
    } as DrinkLog;
  }
  return {
    id: row.id,
    type: 'workout',
    workoutId: row.item_id as WorkoutId,
    workoutName: row.item_name,
    durationMinutes: row.duration_minutes ?? undefined,
    km: row.km ?? undefined,
    elevationMeters: row.elevation_meters ?? undefined,
    calories: row.calories,
    heartsGained: row.hearts_delta,
    timestamp: row.created_at,
  } as WorkoutLog;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<AppState>({ hearts: 10, logs: [] });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setState({ hearts: 10, logs: [] });
      return;
    }
    loadData();
  }, [user?.id]);

  async function loadData() {
    if (!user) return;
    setIsLoading(true);
    try {
      const [profileRes, logsRes] = await Promise.all([
        supabase.from('profiles').select('hearts').eq('id', user.id).single(),
        supabase
          .from('logs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);
      setState({
        hearts: Math.round(profileRes.data?.hearts ?? 10),
        logs: (logsRes.data ?? []).map(rowToLogEntry),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function logDrink(drinkId: DrinkId, quantity: number, activityDate?: string) {
    if (!user) return;
    const drink = DRINK_MAP[drinkId];
    const calories = Math.round(drink.calories * quantity);
    const heartsLost = Math.round(drink.heartsLost * quantity);
    const newHearts = Math.round(state.hearts - heartsLost);
    const logDate = activityDate ?? new Date().toISOString().slice(0, 10);

    const { data: logRow, error } = await supabase
      .from('logs')
      .insert({
        user_id: user.id,
        type: 'drink',
        item_id: drinkId,
        item_name: drink.name,
        quantity,
        calories,
        hearts_delta: -heartsLost,
        activity_date: logDate,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    await supabase
      .from('profiles')
      .update({ hearts: newHearts })
      .eq('id', user.id);

    setState((s) => ({ hearts: newHearts, logs: [rowToLogEntry(logRow), ...s.logs] }));

    return logRow?.id ?? null;
  }

  async function logWorkout(params: LogWorkoutParams) {
    if (!user) return;
    const { workoutId, durationMinutes, km, elevationMeters, overrideCalories, activityDate } = params;
    const logDate = activityDate ?? new Date().toISOString().slice(0, 10);
    const workout = WORKOUT_MAP[workoutId];

    let calories = 0;
    let heartsGained = 0;

    if (overrideCalories != null && overrideCalories > 0) {
      // Health Connect: calorie → cuori
      calories = overrideCalories;
      heartsGained = calcHeartsGained(calories, workoutId);
    } else if (workout.inputType === 'km' && km && km > 0) {
      // Corsa manuale: km → calorie → cuori
      calories = Math.round((workout.calPerKm ?? 60) * km);
      heartsGained = calcHeartsGained(calories, workoutId);
    } else if (workout.inputType === 'km_elevation' && km && km > 0) {
      // Camminata manuale: km+dislivello → cuori diretti
      heartsGained = Math.floor((km + (elevationMeters ?? 0) * 0.03) / 6);
      calories = heartsGained * 240;
    } else if (durationMinutes && durationMinutes > 0) {
      // Sport a durata manuale: tempo → cuori diretti (senza passare per calorie)
      heartsGained = calcHeartsFromDuration(durationMinutes, workout.heartsPerHour ?? 3);
      calories = Math.round((workout.calPerMin ?? 7) * durationMinutes); // solo per storico
    }
    const newHearts = Math.round(state.hearts + heartsGained);

    const { data: logRow, error } = await supabase
      .from('logs')
      .insert({
        user_id: user.id,
        type: 'workout',
        item_id: workoutId,
        item_name: workout.name,
        quantity: durationMinutes ?? km ?? 1,
        calories,
        hearts_delta: heartsGained,
        duration_minutes: durationMinutes ?? null,
        km: km ?? null,
        elevation_meters: elevationMeters ?? null,
        activity_date: logDate,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    await supabase
      .from('profiles')
      .update({ hearts: newHearts })
      .eq('id', user.id);

    setState((s) => ({ hearts: newHearts, logs: [rowToLogEntry(logRow), ...s.logs] }));

    notifyWorkout(user.id, user.username, `${workout.icon ?? ''} ${workout.name}`.trim());

    // Salva country_code in background (non blocca se colonna non esiste)
    if (logRow?.id) {
      getCountryCode().then(cc => {
        if (cc) supabase.from('logs').update({ country_code: cc }).eq('id', logRow.id).then(() => {});
      }).catch(() => {});
    }

    const insertedId = logRow?.id ?? null;

    // Traccia punti skin: 1pt ogni 500m (corsa) o ogni 12min (altri sport)
    // Solo per skin classiche variant-abili — vale per qualsiasi log appena creato,
    // anche se retrodatato a un giorno precedente
    {
      const VARIANT_IDS = VARIANT_SKIN_IDS;
      supabase.from('profiles')
        .select('pig_skin, pig_skin_points, pig_owned_pro_skins')
        .eq('id', user.id).single()
        .then(async ({ data: prof }) => {
          if (!prof) return;
          const skinId: number = prof.pig_skin ?? 0;
          if (!VARIANT_IDS.includes(skinId)) return;
          let ptsEarned = 0;
          if (workout.inputType === 'km' && km && km >= 0.5) ptsEarned = Math.floor(km / 0.5);
          else if (durationMinutes && durationMinutes >= 12) ptsEarned = Math.floor(durationMinutes / 12);
          if (ptsEarned <= 0) return;
          const points: Record<string, number> = prof.pig_skin_points ?? {};
          const key = String(skinId);
          const prev = points[key] ?? 0;
          const next = prev + ptsEarned;
          const update: any = { pig_skin_points: { ...points, [key]: next } };
          // Sblocca pro se raggiunge 100 punti
          const ownedPro: number[] = prof.pig_owned_pro_skins ?? [];
          if (next >= 100 && !ownedPro.includes(skinId)) {
            update.pig_owned_pro_skins = [...ownedPro, skinId];
          }
          supabase.from('profiles').update(update).eq('id', user.id).then(() => {});
        });
    }

    // Notifica sorpasso classifica clan
    if (user.clanId) {
      const { data: members } = await supabase
        .from('profiles')
        .select('id, username, hearts, push_token, notif_pref')
        .eq('clan_id', user.clanId)
        .neq('id', user.id);

      if (members) {
        const overtaken = members.filter(
          (m) => m.hearts !== null && m.hearts >= state.hearts && m.hearts < newHearts && m.push_token
            && (m.notif_pref ?? 'important') !== 'none',
        );
        for (const m of overtaken) {
          await sendPushNotification(
            m.push_token,
            'RunCool — Sorpasso! 🏃',
            `${user.username} ti ha superato in classifica! Muoviti maialino 🐷`,
          );
        }
      }
    }

    return insertedId;
  }

  async function deleteLog(id: string) {
    if (!user) return;
    const log = state.logs.find((l) => l.id === id);
    if (!log) return;

    const delta = log.type === 'drink' ? log.heartsLost : -log.heartsGained;
    const newHearts = Math.round(state.hearts + delta);

    await supabase.from('logs').delete().eq('id', id).eq('user_id', user.id);
    await supabase.from('profiles').update({ hearts: newHearts }).eq('id', user.id);

    setState((s) => ({
      hearts: newHearts,
      logs: s.logs.filter((l) => l.id !== id),
    }));
  }

  return (
    <AppContext.Provider value={{ state, isLoading, logDrink, logWorkout, deleteLog }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
