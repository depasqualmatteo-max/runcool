import { WorkoutDefinition, WorkoutId } from '@/types';

export const WORKOUTS: WorkoutDefinition[] = [
  // km-based (cuori calcolati da km, non da tempo)
  { id: 'corsa',     name: 'Corsa',     icon: '🏃', inputType: 'km',           calPerKm: 60 },
  { id: 'camminata', name: 'Camminata', icon: '🚶', inputType: 'km_elevation' },
  // duration-based: heartsPerHour usato per calcolo manuale
  { id: 'hiit',           name: 'HIIT',           icon: '🔥', inputType: 'duration', calPerMin: 9,  heartsPerHour: 4 },
  { id: 'palestra',       name: 'Palestra',       icon: '💪', inputType: 'duration', calPerMin: 8,  heartsPerHour: 4 },
  { id: 'tennis',         name: 'Tennis',         icon: '🎾', inputType: 'duration', calPerMin: 7,  heartsPerHour: 3 },
  { id: 'padel',          name: 'Padel',          icon: '🏓', inputType: 'duration', calPerMin: 7,  heartsPerHour: 3 },
  { id: 'calcetto',       name: 'Calcetto',       icon: '⚽', inputType: 'duration', calPerMin: 9,  heartsPerHour: 4 },
  { id: 'pilates',        name: 'Pilates',        icon: '🧘', inputType: 'duration', calPerMin: 3,  heartsPerHour: 3 },
  { id: 'nuoto',          name: 'Nuoto',          icon: '🏊', inputType: 'duration', calPerMin: 10, heartsPerHour: 5 },
  { id: 'ciclismo',       name: 'Ciclismo',       icon: '🚴', inputType: 'duration', calPerMin: 9,  heartsPerHour: 4 },
  { id: 'boxe',           name: 'Boxe',           icon: '🥊', inputType: 'duration', calPerMin: 11, heartsPerHour: 5 },
  { id: 'danza',          name: 'Danza',          icon: '💃', inputType: 'duration', calPerMin: 5,  heartsPerHour: 2 },
  { id: 'ferrata',        name: 'Ferrata',        icon: '🧗', inputType: 'duration', calPerMin: 10, heartsPerHour: 5 },
  { id: 'arrampicata',    name: 'Arrampicata',    icon: '🧗', inputType: 'duration', calPerMin: 8,  heartsPerHour: 4 },
  { id: 'idrospeed',      name: 'Idrospeed',      icon: '🌊', inputType: 'duration', calPerMin: 10, heartsPerHour: 5 },
  { id: 'subacquea',      name: 'Subacquea',      icon: '🤿', inputType: 'duration', calPerMin: 8,  heartsPerHour: 4 },
  { id: 'paintball',      name: 'Paintball',      icon: '🎯', inputType: 'duration', calPerMin: 8,  heartsPerHour: 4 },
  { id: 'surf',           name: 'Surf',           icon: '🏄', inputType: 'duration', calPerMin: 6,  heartsPerHour: 3 },
  { id: 'parco_avventura',name: 'Parco avventura',icon: '🌲', inputType: 'duration', calPerMin: 6,  heartsPerHour: 3 },
  { id: 'vela',           name: 'Vela',           icon: '⛵', inputType: 'duration', calPerMin: 6,  heartsPerHour: 3 },
];

export const WORKOUT_MAP: Record<WorkoutId, WorkoutDefinition> = Object.fromEntries(
  WORKOUTS.map((w) => [w.id, w])
) as Record<WorkoutId, WorkoutDefinition>;

export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

// Cuori da tempo (manuale): floor(minuti * heartsPerHour / 60)
export function calcHeartsFromDuration(durationMinutes: number, heartsPerHour: number): number {
  return Math.floor(durationMinutes * heartsPerHour / 60);
}

// Camminata: 35 cal/km + 0.2 cal/m dislivello, max 700
export function calcWalkingCalories(km: number, elevationMeters: number): number {
  return Math.min(Math.round(35 * km + 0.2 * elevationMeters), 700);
}
