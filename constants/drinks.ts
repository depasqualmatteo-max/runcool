import { DrinkDefinition, DrinkId } from '@/types';

export const DRINKS: DrinkDefinition[] = [
  { id: 'birra_piccola',  name: 'Birra Piccola',     calories: 150, icon: '🍺', heartsLost: 1 },
  { id: 'birra_media',    name: 'Birra Media',        calories: 215, icon: '🍺', heartsLost: 1 },
  { id: 'calice_vino',    name: 'Calice di Vino',     calories: 120, icon: '🍷', heartsLost: 1 },
  { id: 'cocktail',       name: 'Cocktail',           calories: 180, icon: '🍹', heartsLost: 2 },
  { id: 'amaro',          name: 'Amaro',              calories: 90,  icon: '🥃', heartsLost: 1 },
  { id: 'bottiglia_vino', name: 'Bottiglia di Vino',  calories: 600, icon: '🍾', heartsLost: 6, hasQuantityPrompt: true },
];

export const DRINK_MAP: Record<DrinkId, DrinkDefinition> = Object.fromEntries(
  DRINKS.map((d) => [d.id, d])
) as Record<DrinkId, DrinkDefinition>;
