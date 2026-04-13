// ─── DRINK ───
// 1 cuore perso ogni 120 calorie
export const CAL_PER_HEART_DRINK = 120;

export function calcHeartsLost(calories: number): number {
  return Math.floor(calories / CAL_PER_HEART_DRINK);
}

// ─── SPORT ───
// Ogni sport ha il suo calPerHeart (dal planning Excel)
// corsa: 120, pilates: 60, camminata: 240, default: 100
export const SPORT_CAL_PER_HEART: Record<string, number> = {
  corsa: 120,
  pilates: 60,
  camminata: 240,
};
export const DEFAULT_CAL_PER_HEART = 120;

export function calPerHeartForSport(sportId: string): number {
  return SPORT_CAL_PER_HEART[sportId] ?? DEFAULT_CAL_PER_HEART;
}

export function calcHeartsGained(caloriesBurned: number, sportId?: string): number {
  const cph = sportId ? calPerHeartForSport(sportId) : DEFAULT_CAL_PER_HEART;
  return Math.max(1, Math.floor(caloriesBurned / cph));
}
