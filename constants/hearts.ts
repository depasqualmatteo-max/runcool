// ─── DRINK ───
// 1 cuore perso ogni 120 calorie
export const CAL_PER_HEART_DRINK = 120;

export function calcHeartsLost(calories: number): number {
  return Math.floor(calories / CAL_PER_HEART_DRINK);
}

// ─── SPORT ───
// Ogni sport ha il suo calPerHeart (dal planning Excel)
// corsa: 120, pilates: 60, camminata: 240, default: 120
export const SPORT_CAL_PER_HEART: Record<string, number> = {
  corsa: 120,
  pilates: 60,
  camminata: 180,
};
export const DEFAULT_CAL_PER_HEART = 120;

export function calPerHeartForSport(sportId: string): number {
  return SPORT_CAL_PER_HEART[sportId] ?? DEFAULT_CAL_PER_HEART;
}

export function calcHeartsGained(caloriesBurned: number, sportId?: string): number {
  const cph = sportId ? calPerHeartForSport(sportId) : DEFAULT_CAL_PER_HEART;
  // Arrotonda: con cph=120 servono 80 kcal (2/3 della soglia) per scattare al cuore successivo,
  // invece di richiedere le 120 kcal piene (floor puro)
  return Math.floor((caloriesBurned + cph / 3) / cph);
}
