export type DrinkId =
  | 'beer_pint' | 'beer_large' | 'wine_glass' | 'wine_large'
  | 'prosecco' | 'spritz' | 'cocktail' | 'shot' | 'whisky'
  | 'gin_tonic' | 'mojito' | 'amaro';

export type WorkoutId =
  | 'corsa' | 'palestra' | 'ciclismo' | 'nuoto' | 'camminata'
  | 'yoga' | 'hiit' | 'calcio' | 'basket' | 'tennis';

export interface DrinkDefinition {
  id: DrinkId;
  name: string;
  calories: number;
  icon: string;
}

export interface WorkoutDefinition {
  id: WorkoutId;
  name: string;
  calPerMin: number;
  icon: string;
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
  durationMinutes: number;
  calories: number;
  heartsGained: number;
  timestamp: string;
}

export type LogEntry = DrinkLog | WorkoutLog;

export interface AppState {
  hearts: number;
  logs: LogEntry[];
}

export type AppAction =
  | { type: 'HYDRATE'; payload: AppState }
  | { type: 'LOG_DRINK'; payload: { drinkId: DrinkId; quantity: number } }
  | { type: 'LOG_WORKOUT'; payload: { workoutId: WorkoutId; durationMinutes: number } }
  | { type: 'DELETE_LOG'; payload: { id: string } };
