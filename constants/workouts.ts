import { WorkoutDefinition, WorkoutId } from '@/types';

export const WORKOUTS: WorkoutDefinition[] = [
  // km-based
  { id: 'corsa',     name: 'Corsa',     icon: '🏃', inputType: 'km',           calPerKm: 75 },
  { id: 'camminata', name: 'Camminata', icon: '🚶', inputType: 'km_elevation' },
  // minutes-based
  { id: 'hiit',      name: 'HIIT',      icon: '🔥', inputType: 'duration', calPerMin: 12 },
  { id: 'palestra',  name: 'Palestra',  icon: '💪', inputType: 'duration', calPerMin: 8  },
  { id: 'tennis',    name: 'Tennis',    icon: '🎾', inputType: 'duration', calPerMin: 7  },
  { id: 'padel',     name: 'Padel',     icon: '🏓', inputType: 'duration', calPerMin: 7  },
  { id: 'calcetto',  name: 'Calcetto',  icon: '⚽', inputType: 'duration', calPerMin: 9  },
  { id: 'pilates',   name: 'Pilates',   icon: '🧘', inputType: 'duration', calPerMin: 4  },
  { id: 'nuoto',     name: 'Nuoto',     icon: '🏊', inputType: 'duration', calPerMin: 10 },
  { id: 'ciclismo',  name: 'Ciclismo',  icon: '🚴', inputType: 'duration', calPerMin: 9  },
  { id: 'boxe',      name: 'Boxe',      icon: '🥊', inputType: 'duration', calPerMin: 11 },
  { id: 'danza',     name: 'Danza',     icon: '💃', inputType: 'duration', calPerMin: 5  },
];

export const WORKOUT_MAP: Record<WorkoutId, WorkoutDefinition> = Object.fromEntries(
  WORKOUTS.map((w) => [w.id, w])
) as Record<WorkoutId, WorkoutDefinition>;

export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

// Naismith-based: ~60 kcal/km flat + 0.5 kcal per meter of elevation
export function calcWalkingCalories(km: number, elevationMeters: number): number {
  return Math.round(60 * km + 0.5 * elevationMeters);
}
