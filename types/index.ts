export type DrinkId =
  | 'birra_piccola'
  | 'birra_media'
  | 'calice_vino'
  | 'cocktail'
  | 'amaro'
  | 'bottiglia_vino'
  | 'evento_matrimonio'
  | 'evento_barca';

export type WorkoutId =
  | 'corsa'
  | 'camminata'
  | 'hiit'
  | 'palestra'
  | 'tennis'
  | 'padel'
  | 'calcetto'
  | 'pilates'
  | 'nuoto'
  | 'ciclismo'
  | 'boxe'
  | 'danza'
  | 'ferrata'
  | 'arrampicata'
  | 'idrospeed'
  | 'subacquea'
  | 'paintball'
  | 'surf'
  | 'parco_avventura'
  | 'vela';

export type WorkoutInputType = 'duration' | 'km' | 'km_elevation';

export interface DrinkDefinition {
  id: DrinkId;
  name: string;
  calories: number;
  icon: string;
  heartsLost: number;
  hasQuantityPrompt?: boolean;
}

export interface WorkoutDefinition {
  id: WorkoutId;
  name: string;
  icon: string;
  inputType: WorkoutInputType;
  calPerMin?: number;
  calPerKm?: number;
  heartsPerHour?: number; // per calcolo manuale basato sul tempo
}

export interface DrinkLog {
  id: string;
  type: 'drink';
  drinkId: DrinkId;
  drinkName: string;
  quantity: number;
  calories: number;
  heartsLost: number;
  timestamp: string;
}

export interface WorkoutLog {
  id: string;
  type: 'workout';
  workoutId: WorkoutId;
  workoutName: string;
  durationMinutes?: number;
  km?: number;
  elevationMeters?: number;
  calories: number;
  heartsGained: number;
  timestamp: string;
}

export type LogEntry = DrinkLog | WorkoutLog;

export interface User {
  id: string;
  email: string;
  username: string;
  clanId: string | null;
}

export interface ClanMember {
  id: string;
  username: string;
  hearts: number;
}

export interface Clan {
  id: string;
  name: string;
  code: string;
  ownerId: string;
  members: ClanMember[];
}

export interface AppState {
  hearts: number;
  logs: LogEntry[];
}
