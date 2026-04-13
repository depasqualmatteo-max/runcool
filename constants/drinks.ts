import { DrinkDefinition, DrinkId } from '@/types';

// 1 cuore perso ogni 120 calorie (floor, solo interi)
export const CAL_PER_HEART_DRINK = 120;

export const DRINKS: DrinkDefinition[] = [
  { id: 'birra_piccola',  name: 'Birra Piccola',     calories: 120, icon: '🍺', heartsLost: 1 },
  { id: 'birra_media',    name: 'Birra Media',        calories: 120, icon: '🍺', heartsLost: 1 },
  { id: 'calice_vino',    name: 'Calice di Vino',     calories: 120, icon: '🍷', heartsLost: 1 },
  { id: 'cocktail',       name: 'Cocktail',           calories: 240, icon: '🍹', heartsLost: 2 },
  { id: 'amaro',          name: 'Amaro',              calories: 120, icon: '🥃', heartsLost: 1 },
  { id: 'bottiglia_vino', name: 'Bottiglia di Vino',  calories: 720, icon: '🍾', heartsLost: 6, hasQuantityPrompt: true },
];

export const DRINK_MAP: Record<DrinkId, DrinkDefinition> = Object.fromEntries(
  DRINKS.map((d) => [d.id, d])
) as Record<DrinkId, DrinkDefinition>;
