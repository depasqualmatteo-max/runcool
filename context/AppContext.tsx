import React, { createContext, useContext, useEffect, useReducer } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppAction, AppState, DrinkLog, WorkoutLog } from '@/types';
import { DRINK_MAP } from '@/constants/drinks';
import { WORKOUT_MAP } from '@/constants/workouts';
import { calcHeartsLost, calcHeartsGained } from '@/constants/hearts';

const STORAGE_KEY = '@runcool/state';

const initialState: AppState = {
  hearts: 0,
  logs: [],
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'HYDRATE':
      return action.payload;

    case 'LOG_DRINK': {
      const { drinkId, quantity } = action.payload;
      const drink = DRINK_MAP[drinkId];
      const totalCalories = drink.calories * quantity;
      const heartsLost = calcHeartsLost(totalCalories);
      const entry: DrinkLog = {
        id: Date.now().toString(),
        type: 'drink',
        drinkId,
        drinkName: drink.name,
        quantity,
        calories: totalCalories,
        heartsLost,
        timestamp: new Date().toISOString(),
      };
      return {
        hearts: state.hearts - heartsLost,
        logs: [entry, ...state.logs],
      };
    }

    case 'LOG_WORKOUT': {
      const { workoutId, durationMinutes } = action.payload;
      const workout = WORKOUT_MAP[workoutId];
      const caloriesBurned = workout.calPerMin * durationMinutes;
      const heartsGained = calcHeartsGained(caloriesBurned);
      const entry: WorkoutLog = {
        id: Date.now().toString(),
        type: 'workout',
        workoutId,
        workoutName: workout.name,
        durationMinutes,
        calories: caloriesBurned,
        heartsGained,
        timestamp: new Date().toISOString(),
      };
      return {
        hearts: state.hearts + heartsGained,
        logs: [entry, ...state.logs],
      };
    }

    case 'DELETE_LOG': {
      const log = state.logs.find((l) => l.id === action.payload.id);
      if (!log) return state;
      const delta = log.type === 'drink' ? log.heartsLost : -log.heartsGained;
      return {
        hearts: state.hearts + delta,
        logs: state.logs.filter((l) => l.id !== action.payload.id),
      };
    }

    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Hydrate from storage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          dispatch({ type: 'HYDRATE', payload: JSON.parse(raw) });
        } catch {}
      }
    });
  }, []);

  // Persist on every state change
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
