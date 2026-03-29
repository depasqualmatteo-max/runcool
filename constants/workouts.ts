import { WorkoutDefinition, WorkoutId } from '@/types';

export const WORKOUTS: WorkoutDefinition[] = [
  // km-based
  { id: 'corsa',     name: 'Corsa',     icon: '🏃', inputType: 'km',           calPerKm: 60 },
  { id: 'camminata', name: 'Camminata', icon: '🚶', inputType: 'km_elevation' },
  // minutes-based
  { id: 'hiit',      name: 'HIIT',      icon: '🔥', inputType: 'duration', calPerMin: 9  },
  { id: 'palestra',  name: 'Palestra',  icon: '💪', inputType: 'duration', calPerMin: 8  },
  { id: 'tennis',    name: 'Tennis',    icon: '🎾', inputType: 'duration', calPerMin: 7  },
  { id: 'padel',     name: 'Padel',     icon: '🏓', inputType: 'duration', calPerMin: 7  },
  { id: 'calcetto',  name: 'Calcetto',  icon: '⚽', inputType: 'duration', calPerMin: 9  },
  { id: 'pilates',   name: 'Pilates',   icon: '🧘', inputType: 'duration', calPerMin: 5  },
  { id: 'nuoto',     name: 'Nuoto',     icon: '🏊', inputType: 'duration', calPerMin: 10 },
  { id: 'ciclismo',  name: 'Ciclismo',  icon: '🚴', inputType: 'duration', calPerMin: 9  },
  { id: 'boxe',      name: 'Boxe',      icon: '🥊', inputType: 'duration', calPerMin: 11 },
  { id: 'danza',     name: 'Danza',     icon: '💃', inputType: 'duration', calPerMin: 5  },
];

export const WORKOUT_MAP: Record<WorkoutId, WorkoutDefinition> = Object.fromEntries(
  WORKOUTS.map((w) => [w.id, w])
) as Record<WorkoutId, WorkoutDefinition>;

export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

// Ridotto rispetto al Naismith reale: max 7 cuori anche per un'escursione intera
export function calcWalkingCalories(km: number, elevationMeters: number): number {
  return Math.min(Math.round(35 * km + 0.2 * elevationMeters), 700);
}
