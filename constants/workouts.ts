import { WorkoutDefinition, WorkoutId } from '@/types';

export const WORKOUTS: WorkoutDefinition[] = [
  { id: 'corsa',      name: 'Corsa',       calPerMin: 10, icon: '🏃' },
  { id: 'hiit',       name: 'HIIT',        calPerMin: 12, icon: '🔥' },
  { id: 'nuoto',      name: 'Nuoto',       calPerMin: 10, icon: '🏊' },
  { id: 'ciclismo',   name: 'Ciclismo',    calPerMin: 9,  icon: '🚴' },
  { id: 'calcio',     name: 'Calcio',      calPerMin: 9,  icon: '⚽' },
  { id: 'palestra',   name: 'Palestra',    calPerMin: 8,  icon: '💪' },
  { id: 'basket',     name: 'Basket',      calPerMin: 8,  icon: '🏀' },
  { id: 'tennis',     name: 'Tennis',      calPerMin: 7,  icon: '🎾' },
  { id: 'camminata',  name: 'Camminata',   calPerMin: 4,  icon: '🚶' },
  { id: 'yoga',       name: 'Yoga',        calPerMin: 3,  icon: '🧘' },
];

export const WORKOUT_MAP: Record<WorkoutId, WorkoutDefinition> = Object.fromEntries(
  WORKOUTS.map((w) => [w.id, w])
) as Record<WorkoutId, WorkoutDefinition>;

export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];
