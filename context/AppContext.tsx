import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AppState, DrinkLog, LogEntry, WorkoutLog } from '@/types';
import { DRINK_MAP } from '@/constants/drinks';
import { WORKOUT_MAP, calcWalkingCalories } from '@/constants/workouts';
import { calcHeartsLost, calcHeartsGained } from '@/constants/hearts';
import { useAuth } from '@/context/AuthContext';
import type { DrinkId, WorkoutId } from '@/types';

export interface LogWorkoutParams {
  workoutId: WorkoutId;
  durationMinutes?: number;
  km?: number;
  elevationMeters?: number;
}

interface AppContextValue {
  state: AppState;
  isLoading: boolean;
  logDrink: (drinkId: DrinkId, quantity: number) => Promise<void>;
  logWorkout: (params: LogWorkoutParams) => Promise<void>;
  deleteLog: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

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
        hearts: profileRes.data?.hearts ?? 10,
        logs: (logsRes.data ?? []).map(rowToLogEntry),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function logDrink(drinkId: DrinkId, quantity: number) {
    if (!user) return;
    const drink = DRINK_MAP[drinkId];
    const calories = drink.calories * quantity;
    const heartsLost = calcHeartsLost(calories);
    const newHearts = state.hearts - heartsLost;

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
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    await supabase
      .from('profiles')
      .update({ hearts: newHearts })
      .eq('id', user.id);

    setState((s) => ({ hearts: newHearts, logs: [rowToLogEntry(logRow), ...s.logs] }));
  }

  async function logWorkout(params: LogWorkoutParams) {
    if (!user) return;
    const { workoutId, durationMinutes, km, elevationMeters } = params;
    const workout = WORKOUT_MAP[workoutId];

    let calories = 0;
    if (workout.inputType === 'duration' && durationMinutes) {
      calories = (workout.calPerMin ?? 0) * durationMinutes;
    } else if (workout.inputType === 'km' && km) {
      calories = (workout.calPerKm ?? 75) * km;
    } else if (workout.inputType === 'km_elevation') {
      calories = calcWalkingCalories(km ?? 0, elevationMeters ?? 0);
    }

    const heartsGained = calcHeartsGained(calories);
    const newHearts = state.hearts + heartsGained;

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
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    await supabase
      .from('profiles')
      .update({ hearts: newHearts })
      .eq('id', user.id);

    setState((s) => ({ hearts: newHearts, logs: [rowToLogEntry(logRow), ...s.logs] }));
  }

  async function deleteLog(id: string) {
    if (!user) return;
    const log = state.logs.find((l) => l.id === id);
    if (!log) return;

    const delta = log.type === 'drink' ? log.heartsLost : -log.heartsGained;
    const newHearts = state.hearts + delta;

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
