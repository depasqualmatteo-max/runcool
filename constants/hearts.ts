// Calorie per ogni cuore
// Drink:   Math.ceil(calories / CALORIES_PER_HEART)  → cuori persi (arrotonda su)
// Workout: Math.floor(caloriesBurned / CALORIES_PER_HEART) → cuori guadagnati (arrotonda giù)
export const CALORIES_PER_HEART = 100;

export function calcHeartsLost(calories: number): number {
  return Math.ceil(calories / CALORIES_PER_HEART);
}

export function calcHeartsGained(caloriesBurned: number): number {
  return Math.max(1, Math.floor(caloriesBurned / CALORIES_PER_HEART));
}
